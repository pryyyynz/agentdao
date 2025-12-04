"""
Due Diligence Analyzer Service for AgentDAO
Performs background checks on grant applicants including GitHub, wallet, and reputation analysis
"""

import json
import time
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import logging
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import settings
from utils.common import get_utc_now


# Setup logger
logger = logging.getLogger(__name__)


class DueDiligenceAnalyzer:
    """
    Due diligence and background verification analyzer
    
    Evaluates grant applicants on:
    - GitHub activity and code contributions
    - Commit history and contribution quality
    - Wallet address transaction history
    - Red flags and suspicious patterns
    - Community reputation and social proof
    - Previous project verification
    
    Risk Scoring: 0 (high risk) to 100 (low risk/trustworthy)
    """
    
    def __init__(self):
        """Initialize Due Diligence Analyzer with API clients"""
        self.github_token = settings.GITHUB_API_KEY if hasattr(settings, 'GITHUB_API_KEY') else None
        self.etherscan_key = settings.ETHERSCAN_API_KEY if hasattr(settings, 'ETHERSCAN_API_KEY') else None
        
        # Setup HTTP session with retries
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # GitHub API headers
        self.github_headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Grantify-DueDiligence/1.0'
        }
        if self.github_token:
            self.github_headers['Authorization'] = f'token {self.github_token}'
        
        logger.info("DueDiligenceAnalyzer initialized")
        if not self.github_token:
            logger.warning("GitHub API token not configured - rate limits will apply")
        if not self.etherscan_key:
            logger.warning("Etherscan API key not configured - blockchain analysis limited")
    
    def extract_github_username(self, url_or_username: str) -> Optional[str]:
        """
        Extract GitHub username from URL or return username directly
        
        Args:
            url_or_username: GitHub profile URL or username
        
        Returns:
            GitHub username or None
        """
        if not url_or_username:
            return None
        
        # If it's already a username (no special chars except hyphens)
        if re.match(r'^[a-zA-Z0-9\-]+$', url_or_username):
            return url_or_username
        
        # Try to extract from URL
        try:
            parsed = urlparse(url_or_username)
            if 'github.com' in parsed.netloc:
                # Extract username from path like /username or /username/repo
                path_parts = [p for p in parsed.path.split('/') if p]
                if path_parts:
                    return path_parts[0]
        except Exception as e:
            logger.error(f"Error parsing GitHub URL: {e}")
        
        return None
    
    def fetch_github_user(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Fetch GitHub user profile data
        
        Args:
            username: GitHub username
        
        Returns:
            User profile data or None
        """
        try:
            url = f"https://api.github.com/users/{username}"
            response = self.session.get(url, headers=self.github_headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                logger.warning(f"GitHub user not found: {username}")
                return None
            else:
                logger.error(f"GitHub API error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching GitHub user {username}: {e}")
            return None
    
    def fetch_github_repos(self, username: str, max_repos: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch user's GitHub repositories
        
        Args:
            username: GitHub username
            max_repos: Maximum number of repos to fetch
        
        Returns:
            List of repository data
        """
        try:
            url = f"https://api.github.com/users/{username}/repos"
            params = {
                'sort': 'updated',
                'per_page': min(max_repos, 100),
                'type': 'all'
            }
            response = self.session.get(url, headers=self.github_headers, params=params, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"GitHub repos API error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching GitHub repos for {username}: {e}")
            return []
    
    def fetch_github_events(self, username: str, max_events: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch user's recent GitHub activity events
        
        Args:
            username: GitHub username
            max_events: Maximum number of events to fetch
        
        Returns:
            List of event data
        """
        try:
            url = f"https://api.github.com/users/{username}/events"
            params = {'per_page': min(max_events, 100)}
            response = self.session.get(url, headers=self.github_headers, params=params, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"GitHub events API error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching GitHub events for {username}: {e}")
            return []
    
    def analyze_github_profile(self, username: str) -> Dict[str, Any]:
        """
        Comprehensive GitHub profile analysis
        
        Args:
            username: GitHub username
        
        Returns:
            Analysis results with metrics and flags
        """
        analysis = {
            'username': username,
            'profile_found': False,
            'account_age_days': 0,
            'public_repos': 0,
            'followers': 0,
            'following': 0,
            'total_stars': 0,
            'total_forks': 0,
            'languages': [],
            'recent_activity_days': 0,
            'commit_frequency': 'unknown',
            'contribution_score': 0,
            'is_active': False,
            'red_flags': [],
            'strengths': []
        }
        
        # Fetch user profile
        user = self.fetch_github_user(username)
        if not user:
            analysis['red_flags'].append("GitHub profile not found or inaccessible")
            return analysis
        
        analysis['profile_found'] = True
        analysis['public_repos'] = user.get('public_repos', 0)
        analysis['followers'] = user.get('followers', 0)
        analysis['following'] = user.get('following', 0)
        
        # Calculate account age
        created_at = datetime.strptime(user.get('created_at', ''), '%Y-%m-%dT%H:%M:%SZ')
        account_age = (datetime.utcnow() - created_at).days
        analysis['account_age_days'] = account_age
        
        # Fetch repositories
        repos = self.fetch_github_repos(username)
        if repos:
            # Calculate total stars and forks
            analysis['total_stars'] = sum(r.get('stargazers_count', 0) for r in repos)
            analysis['total_forks'] = sum(r.get('forks_count', 0) for r in repos)
            
            # Extract languages
            languages = {}
            for repo in repos:
                lang = repo.get('language')
                if lang:
                    languages[lang] = languages.get(lang, 0) + 1
            analysis['languages'] = sorted(languages.keys(), key=lambda x: languages[x], reverse=True)[:5]
            
            # Check for recent updates
            if repos:
                latest_update = max(
                    datetime.strptime(r.get('updated_at', '1970-01-01T00:00:00Z'), '%Y-%m-%dT%H:%M:%SZ')
                    for r in repos
                )
                days_since_update = (datetime.utcnow() - latest_update).days
                analysis['recent_activity_days'] = days_since_update
                analysis['is_active'] = days_since_update <= 30
        
        # Fetch recent activity
        events = self.fetch_github_events(username)
        if events:
            # Analyze commit frequency from recent events
            commit_events = [e for e in events if e.get('type') in ['PushEvent', 'PullRequestEvent']]
            if commit_events:
                event_dates = [
                    datetime.strptime(e.get('created_at', ''), '%Y-%m-%dT%H:%M:%SZ')
                    for e in commit_events
                ]
                if len(event_dates) > 1:
                    date_range = (max(event_dates) - min(event_dates)).days
                    if date_range > 0:
                        freq = len(commit_events) / max(date_range, 1)
                        if freq > 1:
                            analysis['commit_frequency'] = 'high'
                        elif freq > 0.3:
                            analysis['commit_frequency'] = 'medium'
                        else:
                            analysis['commit_frequency'] = 'low'
        
        # Calculate contribution score (0-100)
        score = 0
        score += min(account_age / 365 * 20, 20)  # Up to 20 points for account age (1 year = max)
        score += min(analysis['public_repos'] / 20 * 15, 15)  # Up to 15 points for repos
        score += min(analysis['total_stars'] / 100 * 20, 20)  # Up to 20 points for stars
        score += min(analysis['followers'] / 50 * 15, 15)  # Up to 15 points for followers
        score += 15 if analysis['is_active'] else 0  # 15 points for recent activity
        score += 15 if len(events) > 10 else 10 if len(events) > 5 else 5  # Up to 15 for activity
        
        analysis['contribution_score'] = min(int(score), 100)
        
        # Identify red flags
        if account_age < 30:
            analysis['red_flags'].append(f"Very new account (created {account_age} days ago)")
        if analysis['public_repos'] == 0:
            analysis['red_flags'].append("No public repositories")
        if analysis['followers'] == 0 and account_age > 90:
            analysis['red_flags'].append("No followers on account older than 90 days")
        if not analysis['is_active'] and analysis['recent_activity_days'] > 180:
            analysis['red_flags'].append(f"No recent activity ({analysis['recent_activity_days']} days)")
        if analysis['following'] > analysis['followers'] * 10 and analysis['followers'] > 0:
            analysis['red_flags'].append("Suspicious follow ratio (possible fake engagement)")
        
        # Identify strengths
        if account_age > 365:
            analysis['strengths'].append(f"Established account ({account_age // 365} years)")
        if analysis['total_stars'] > 100:
            analysis['strengths'].append(f"Popular projects ({analysis['total_stars']} total stars)")
        if analysis['public_repos'] > 20:
            analysis['strengths'].append(f"Prolific contributor ({analysis['public_repos']} public repos)")
        if analysis['is_active']:
            analysis['strengths'].append("Recently active on GitHub")
        if len(analysis['languages']) >= 3:
            analysis['strengths'].append(f"Diverse tech stack ({', '.join(analysis['languages'][:3])})")
        
        return analysis
    
    def analyze_wallet_address(self, address: str, network: str = 'ethereum') -> Dict[str, Any]:
        """
        Analyze blockchain wallet address
        
        Args:
            address: Wallet address
            network: Blockchain network (ethereum, polygon, etc.)
        
        Returns:
            Wallet analysis results
        """
        analysis = {
            'address': address,
            'network': network,
            'valid_address': False,
            'transaction_count': 0,
            'first_tx_date': None,
            'last_tx_date': None,
            'account_age_days': 0,
            'balance_eth': 0.0,
            'is_contract': False,
            'red_flags': [],
            'strengths': []
        }
        
        # Validate Ethereum address format
        if not re.match(r'^0x[a-fA-F0-9]{40}$', address):
            analysis['red_flags'].append("Invalid Ethereum address format")
            return analysis
        
        analysis['valid_address'] = True
        
        # If Etherscan API key not available, return basic validation
        if not self.etherscan_key:
            logger.warning("Etherscan API key not configured - returning basic validation only")
            analysis['strengths'].append("Address format is valid")
            return analysis
        
        try:
            # Fetch account balance
            balance_url = "https://api.etherscan.io/api"
            balance_params = {
                'module': 'account',
                'action': 'balance',
                'address': address,
                'tag': 'latest',
                'apikey': self.etherscan_key
            }
            balance_response = self.session.get(balance_url, params=balance_params, timeout=10)
            
            if balance_response.status_code == 200:
                balance_data = balance_response.json()
                if balance_data.get('status') == '1':
                    wei_balance = int(balance_data.get('result', '0'))
                    analysis['balance_eth'] = wei_balance / 1e18
            
            # Fetch transaction count
            tx_count_params = {
                'module': 'proxy',
                'action': 'eth_getTransactionCount',
                'address': address,
                'tag': 'latest',
                'apikey': self.etherscan_key
            }
            tx_count_response = self.session.get(balance_url, params=tx_count_params, timeout=10)
            
            if tx_count_response.status_code == 200:
                tx_count_data = tx_count_response.json()
                if tx_count_data.get('result'):
                    analysis['transaction_count'] = int(tx_count_data.get('result', '0x0'), 16)
            
            # Fetch recent transactions for timeline analysis
            tx_list_params = {
                'module': 'account',
                'action': 'txlist',
                'address': address,
                'startblock': 0,
                'endblock': 99999999,
                'page': 1,
                'offset': 10,
                'sort': 'asc',
                'apikey': self.etherscan_key
            }
            tx_list_response = self.session.get(balance_url, params=tx_list_params, timeout=10)
            
            if tx_list_response.status_code == 200:
                tx_list_data = tx_list_response.json()
                if tx_list_data.get('status') == '1' and tx_list_data.get('result'):
                    transactions = tx_list_data['result']
                    if transactions:
                        first_tx = transactions[0]
                        analysis['first_tx_date'] = datetime.fromtimestamp(int(first_tx['timeStamp']))
                        
                        # Get latest tx
                        last_tx_params = tx_list_params.copy()
                        last_tx_params['sort'] = 'desc'
                        last_tx_params['offset'] = 1
                        last_tx_response = self.session.get(balance_url, params=last_tx_params, timeout=10)
                        
                        if last_tx_response.status_code == 200:
                            last_tx_data = last_tx_response.json()
                            if last_tx_data.get('result'):
                                last_tx = last_tx_data['result'][0]
                                analysis['last_tx_date'] = datetime.fromtimestamp(int(last_tx['timeStamp']))
                                analysis['account_age_days'] = (datetime.utcnow() - analysis['first_tx_date']).days
            
            # Check if contract
            code_params = {
                'module': 'proxy',
                'action': 'eth_getCode',
                'address': address,
                'tag': 'latest',
                'apikey': self.etherscan_key
            }
            code_response = self.session.get(balance_url, params=code_params, timeout=10)
            
            if code_response.status_code == 200:
                code_data = code_response.json()
                if code_data.get('result') and code_data['result'] != '0x':
                    analysis['is_contract'] = True
            
            # Identify red flags
            if analysis['transaction_count'] == 0:
                analysis['red_flags'].append("No transaction history")
            elif analysis['transaction_count'] < 5 and analysis['account_age_days'] > 90:
                analysis['red_flags'].append("Very low activity for account age")
            
            if analysis['balance_eth'] == 0 and analysis['transaction_count'] > 0:
                analysis['red_flags'].append("Zero balance despite transaction history")
            
            if analysis['account_age_days'] < 30:
                analysis['red_flags'].append(f"Very new wallet (only {analysis['account_age_days']} days old)")
            
            # Identify strengths
            if analysis['account_age_days'] > 365:
                analysis['strengths'].append(f"Established wallet ({analysis['account_age_days'] // 365} years)")
            
            if analysis['transaction_count'] > 50:
                analysis['strengths'].append(f"Active wallet ({analysis['transaction_count']} transactions)")
            
            if analysis['balance_eth'] > 0.1:
                analysis['strengths'].append(f"Funded wallet ({analysis['balance_eth']:.4f} ETH)")
            
            if analysis['is_contract']:
                analysis['strengths'].append("Smart contract deployer")
            
        except Exception as e:
            logger.error(f"Error analyzing wallet {address}: {e}")
            analysis['red_flags'].append(f"Error fetching blockchain data: {str(e)}")
        
        return analysis
    
    def detect_red_flags(
        self,
        team_info: Dict[str, Any],
        github_profiles: List[str],
        wallet_addresses: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Detect suspicious patterns and red flags
        
        Args:
            team_info: Team information
            github_profiles: List of GitHub profiles
            wallet_addresses: List of wallet addresses
        
        Returns:
            List of detected red flags with severity
        """
        red_flags = []
        
        # Check team size claims
        claimed_size = team_info.get('team_size', 0)
        provided_profiles = len([p for p in github_profiles if p])
        
        if claimed_size > provided_profiles * 2:
            red_flags.append({
                'severity': 'high',
                'category': 'team_verification',
                'flag': f"Team size mismatch: claims {claimed_size} members but only {provided_profiles} profiles provided",
                'risk_score': -25
            })
        
        # Check for GitHub profiles
        if not github_profiles or all(not p for p in github_profiles):
            red_flags.append({
                'severity': 'high',
                'category': 'verification',
                'flag': "No GitHub profiles provided for verification",
                'risk_score': -30
            })
        
        # Check for wallet addresses
        if not wallet_addresses or all(not w for w in wallet_addresses):
            red_flags.append({
                'severity': 'medium',
                'category': 'verification',
                'flag': "No wallet addresses provided for verification",
                'risk_score': -15
            })
        
        # Check team experience claims
        experience = team_info.get('experience', '').lower()
        if any(word in experience for word in ['expert', 'senior', 'lead', '10+ years']):
            # Should have strong GitHub presence
            if provided_profiles == 0:
                red_flags.append({
                    'severity': 'high',
                    'category': 'credibility',
                    'flag': "Claims senior/expert experience but no GitHub profiles to verify",
                    'risk_score': -20
                })
        
        return red_flags
    
    def calculate_risk_score(
        self,
        github_analyses: List[Dict[str, Any]],
        wallet_analyses: List[Dict[str, Any]],
        detected_red_flags: List[Dict[str, Any]]
    ) -> Tuple[int, float]:
        """
        Calculate overall risk score and confidence
        
        Args:
            github_analyses: List of GitHub analysis results
            wallet_analyses: List of wallet analysis results
            detected_red_flags: List of detected red flags
        
        Returns:
            Tuple of (risk_score 0-100, confidence 0-1)
        """
        # Start with baseline score
        base_score = 50
        
        # GitHub contribution (up to 30 points)
        if github_analyses:
            avg_contribution = sum(g.get('contribution_score', 0) for g in github_analyses) / len(github_analyses)
            github_score = (avg_contribution / 100) * 30
        else:
            github_score = 0
        
        # Wallet activity (up to 25 points)
        wallet_score = 0
        if wallet_analyses:
            for wallet in wallet_analyses:
                if wallet.get('valid_address'):
                    wallet_score += 5  # Valid address
                if wallet.get('transaction_count', 0) > 10:
                    wallet_score += 5  # Active wallet
                if wallet.get('account_age_days', 0) > 180:
                    wallet_score += 5  # Established
                if wallet.get('balance_eth', 0) > 0:
                    wallet_score += 5  # Funded
                if wallet.get('is_contract'):
                    wallet_score += 5  # Contract deployer
            wallet_score = min(wallet_score, 25)
        
        # Red flags penalty (up to -50 points)
        red_flag_penalty = sum(flag.get('risk_score', 0) for flag in detected_red_flags)
        red_flag_penalty = max(red_flag_penalty, -50)  # Cap at -50
        
        # Calculate final score
        final_score = base_score + github_score + wallet_score + red_flag_penalty
        final_score = max(0, min(100, final_score))  # Clamp to 0-100
        
        # Calculate confidence based on data availability
        confidence = 0.5  # Base confidence
        if github_analyses:
            confidence += 0.25
        if wallet_analyses:
            confidence += 0.15
        if len(github_analyses) + len(wallet_analyses) >= 3:
            confidence += 0.10
        
        confidence = min(confidence, 1.0)
        
        return int(final_score), confidence
    
    def perform_due_diligence(
        self,
        grant_id: str,
        team_info: Dict[str, Any],
        github_profiles: List[str],
        wallet_addresses: List[str],
        previous_projects: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive due diligence analysis
        
        Args:
            grant_id: Grant proposal ID
            team_info: Team information (size, experience, etc.)
            github_profiles: List of GitHub profile URLs/usernames
            wallet_addresses: List of wallet addresses
            previous_projects: List of previous project URLs
        
        Returns:
            Complete due diligence analysis results
        """
        start_time = time.time()
        
        logger.info(f"Starting due diligence for grant {grant_id}")
        
        # Analyze GitHub profiles
        github_analyses = []
        for profile in github_profiles:
            if profile:
                username = self.extract_github_username(profile)
                if username:
                    analysis = self.analyze_github_profile(username)
                    github_analyses.append(analysis)
                    time.sleep(0.5)  # Rate limiting
        
        # Analyze wallet addresses
        wallet_analyses = []
        for address in wallet_addresses:
            if address:
                analysis = self.analyze_wallet_address(address)
                wallet_analyses.append(analysis)
                time.sleep(0.5)  # Rate limiting
        
        # Detect red flags
        detected_red_flags = self.detect_red_flags(team_info, github_profiles, wallet_addresses)
        
        # Add red flags from individual analyses
        for gh in github_analyses:
            for flag in gh.get('red_flags', []):
                detected_red_flags.append({
                    'severity': 'medium',
                    'category': 'github',
                    'flag': f"{gh['username']}: {flag}",
                    'risk_score': -5
                })
        
        for wallet in wallet_analyses:
            for flag in wallet.get('red_flags', []):
                detected_red_flags.append({
                    'severity': 'medium',
                    'category': 'blockchain',
                    'flag': f"{wallet['address'][:10]}...: {flag}",
                    'risk_score': -5
                })
        
        # Calculate risk score
        risk_score, confidence = self.calculate_risk_score(
            github_analyses,
            wallet_analyses,
            detected_red_flags
        )
        
        # Compile strengths
        all_strengths = []
        for gh in github_analyses:
            all_strengths.extend([f"{gh['username']}: {s}" for s in gh.get('strengths', [])])
        for wallet in wallet_analyses:
            all_strengths.extend([f"{wallet['address'][:10]}...: {s}" for s in wallet.get('strengths', [])])
        
        # Generate recommendations
        recommendations = []
        if risk_score < 50:
            recommendations.append("⚠️ High risk applicant - recommend additional verification")
        if not github_analyses:
            recommendations.append("Request GitHub profiles for all team members")
        if not wallet_analyses:
            recommendations.append("Request wallet addresses for verification")
        if len(detected_red_flags) > 5:
            recommendations.append("Multiple red flags detected - proceed with caution")
        if risk_score >= 70:
            recommendations.append("✅ Low risk applicant - background checks passed")
        
        execution_time = time.time() - start_time
        
        result = {
            'grant_id': grant_id,
            'risk_score': risk_score,
            'confidence': confidence,
            'risk_level': 'low' if risk_score >= 70 else 'medium' if risk_score >= 40 else 'high',
            'github_profiles_analyzed': len(github_analyses),
            'wallet_addresses_analyzed': len(wallet_analyses),
            'red_flags': detected_red_flags,
            'strengths': all_strengths[:20],  # Limit to 20
            'recommendations': recommendations,
            'github_details': github_analyses,
            'wallet_details': wallet_analyses,
            'metadata': {
                'execution_time_seconds': round(execution_time, 2),
                'analysis_timestamp': get_utc_now().isoformat(),
                'github_api_available': self.github_token is not None,
                'etherscan_api_available': self.etherscan_key is not None
            }
        }
        
        logger.info(f"Due diligence complete for grant {grant_id}: risk_score={risk_score}, confidence={confidence:.0%}")
        
        return result


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    """Test due diligence analyzer with sample data"""
    
    from logging_config import setup_logging
    setup_logging(log_level="DEBUG")
    
    # Sample team data
    sample_team_info = {
        'team_size': 3,
        'experience': '5 years blockchain development, full-stack expertise',
        'previous_grants': ['Project A', 'Project B']
    }
    
    sample_github_profiles = [
        'vitalik',  # Well-known profile for testing
        'fake-user-12345',  # Non-existent profile
    ]
    
    sample_wallets = [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',  # Vitalik's address
        '0x0000000000000000000000000000000000000000'  # Burn address
    ]
    
    # Create analyzer
    analyzer = DueDiligenceAnalyzer()
    
    # Perform analysis
    print("\n" + "="*80)
    print("DUE DILIGENCE ANALYSIS TEST")
    print("="*80)
    
    result = analyzer.perform_due_diligence(
        grant_id="grant-dd-test-001",
        team_info=sample_team_info,
        github_profiles=sample_github_profiles,
        wallet_addresses=sample_wallets
    )
    
    print(f"\n🎯 RISK SCORE: {result['risk_score']}/100 ({result['risk_level'].upper()} RISK)")
    print(f"   Confidence: {result['confidence']:.0%}")
    
    print(f"\n📊 ANALYSIS COVERAGE:")
    print(f"   GitHub Profiles: {result['github_profiles_analyzed']}")
    print(f"   Wallet Addresses: {result['wallet_addresses_analyzed']}")
    
    print(f"\n✅ STRENGTHS ({len(result['strengths'])}):")
    for strength in result['strengths'][:10]:
        print(f"  • {strength}")
    
    print(f"\n🚨 RED FLAGS ({len(result['red_flags'])}):")
    for flag in result['red_flags'][:10]:
        severity = flag.get('severity', 'unknown').upper()
        print(f"  [{severity}] {flag.get('flag', 'N/A')}")
    
    print(f"\n💡 RECOMMENDATIONS ({len(result['recommendations'])}):")
    for rec in result['recommendations']:
        print(f"  • {rec}")
    
    print(f"\n⏱️  Execution Time: {result['metadata']['execution_time_seconds']}s")
    
    print("\n" + "="*80)
    print("✅ TEST COMPLETE")
    print("="*80)
