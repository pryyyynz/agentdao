/**
 * Evaluator Agent - Connects orchestrator messages to Python AI services
 */
import { EventEmitter } from 'events';
import axios from 'axios';
import { AgentType, MessageType } from '../types.js';

export interface EvaluatorConfig {
  agentType: AgentType;
  pythonServiceUrl: string;
  endpoint: string; // e.g., '/api/v1/technical/analyze'
}

export class EvaluatorAgent extends EventEmitter {
  private config: EvaluatorConfig;
  private processing: boolean = false;
  private communication: any;

  constructor(config: EvaluatorConfig) {
    super();
    this.config = config;
  }

  /**
   * Handle evaluation request message from orchestrator
   */
  async handleEvaluationRequest(message: any): Promise<void> {
    if (this.processing) {
      console.log(`[${this.config.agentType}] Already processing, queuing request`);
      return;
    }

    this.processing = true;
    const { grant_id, grant_data } = message.data;

    try {
      console.log(`[${this.config.agentType}] Starting evaluation for grant ${grant_id}`);

      // Parse detailed proposal if it's a JSON string
      let proposalData: any = {};
      if (grant_data.detailed_proposal) {
        if (typeof grant_data.detailed_proposal === 'string') {
          try {
            proposalData = JSON.parse(grant_data.detailed_proposal);
          } catch (e) {
            console.warn(`[${this.config.agentType}] Failed to parse detailed_proposal, using basic data`);
          }
        } else {
          proposalData = grant_data.detailed_proposal;
        }
      }

      // Debug: Log proposal data structure
      console.log(`[${this.config.agentType}] Proposal data keys for grant ${grant_id}:`, Object.keys(proposalData));
      if (this.config.agentType === AgentType.BUDGET && proposalData.budgetBreakdown) {
        console.log(`[${this.config.agentType}] Raw budgetBreakdown:`, JSON.stringify(proposalData.budgetBreakdown, null, 2));
      }
      if (this.config.agentType === AgentType.DUE_DILIGENCE) {
        console.log(`[${this.config.agentType}] Raw githubProfiles:`, proposalData.githubProfiles);
        console.log(`[${this.config.agentType}] Raw walletAddresses:`, proposalData.walletAddresses);
      }

      // Build request payload matching Python service expectations
      const payload = {
        grant_id: String(grant_id),
        title: proposalData.projectName || grant_data.project_name || grant_data.title || 'Untitled',
        description: proposalData.description || grant_data.description || '',
        funding_amount: Number(proposalData.requestedAmount || grant_data.amount || grant_data.requested_amount || 0),
        
        // Technical analysis fields (mapped from detailed_proposal)
        timeline: proposalData.duration ? `${proposalData.duration} months` : (grant_data.duration_months ? `${grant_data.duration_months} months` : 'Not specified'),
        tech_stack: proposalData.techStack && Array.isArray(proposalData.techStack) ? 
          proposalData.techStack.map((t: any) => typeof t === 'string' ? t : `${t.name}: ${t.purpose}`).join('; ') : 
          (grant_data.tech_stack || 'Modern blockchain stack'),
        team_experience: proposalData.previousWork || 
          (proposalData.team && Array.isArray(proposalData.team) ? 
            proposalData.team.map((t: any) => `${t.name} (${t.role})`).join('; ') : 
            'Experienced team'),
        architecture: proposalData.solution || 
          (proposalData.techStack && Array.isArray(proposalData.techStack) ? 
            proposalData.techStack.map((t: any) => typeof t === 'object' ? t.purpose : '').filter(Boolean).join('; ') : 
            'Technical architecture'),
        
        // Impact analysis fields (mapped from detailed_proposal)
        objectives: proposalData.problemStatement || 
          (proposalData.milestones && Array.isArray(proposalData.milestones) ? 
            proposalData.milestones.map((m: any) => m.title).join('; ') : 
            'Project objectives'),
        target_users: proposalData.tagline || proposalData.description?.substring(0, 100) || 
          (grant_data.category || 'Web3 users'),
        expected_outcomes: proposalData.deliverables || 
          (proposalData.milestones && Array.isArray(proposalData.milestones) ? 
            proposalData.milestones.map((m: any) => `${m.title}: ${m.deliverables || m.description}`).join('; ') : 
            'Project deliverables'),
        sustainability_plan: proposalData.additionalNotes || 
          proposalData.previousWork || 
          (proposalData.milestones && Array.isArray(proposalData.milestones) && proposalData.milestones.length > 0 ? 
            `Project planned over ${proposalData.milestones.length} milestones spanning ${proposalData.duration} months` : 
            'Long-term sustainability'),
        ecosystem_fit: proposalData.solution || 
          proposalData.description || 
          `${proposalData.category || 'blockchain'} project contributing to ecosystem`,
        
        // Due diligence fields (mapped from detailed_proposal)
        team_size: proposalData.team ? proposalData.team.length : (grant_data.team_size || 1),
        github_profiles: [
          ...(proposalData.githubProfiles ? proposalData.githubProfiles : []),
          ...(proposalData.githubRepo ? [proposalData.githubRepo] : []),
          ...(grant_data.github_repo ? [grant_data.github_repo] : []),
          ...(proposalData.team ? proposalData.team.filter((t: any) => t.github).map((t: any) => t.github) : [])
        ].filter(Boolean),
        wallet_addresses: [
          ...(proposalData.walletAddresses ? proposalData.walletAddresses : []),
          ...(proposalData.applicantAddress ? [proposalData.applicantAddress] : []),
          ...(proposalData.paymentAddress && proposalData.paymentAddress !== proposalData.applicantAddress ? [proposalData.paymentAddress] : []),
          // Fallback to grant_data applicant fields
          ...(grant_data.applicant ? [grant_data.applicant] : []),
          ...(grant_data.applicant_address ? [grant_data.applicant_address] : [])
        ].filter((v: any, i: number, a: any[]) => Boolean(v) && a.indexOf(v) === i),
        previous_projects: proposalData.previousWork ? [proposalData.previousWork] : [],
        linkedin_profiles: proposalData.team ? proposalData.team.filter((t: any) => t.linkedin).map((t: any) => t.linkedin) : [],
        
        // Budget fields (mapped from detailed_proposal)
        total_amount: Number(proposalData.requestedAmount || grant_data.amount || grant_data.requested_amount || 0),
        currency: 'ETH',
        project_type: proposalData.category || grant_data.category || 'software',
        budget_items: proposalData.budgetBreakdown ? proposalData.budgetBreakdown.map((item: any) => ({
          category: item.category || item.name || 'general',
          description: item.description || item.justification || item.title || 'Budget item',
          amount: Number(item.amount || item.value || item.cost || 0),
          quantity: Number(item.quantity || 1),
        })).filter((item: any) => item.amount > 0) : [],
        deliverables: proposalData.deliverables ? 
          (typeof proposalData.deliverables === 'string' ? [proposalData.deliverables] : 
           Array.isArray(proposalData.deliverables) ? proposalData.deliverables : []) : 
          (proposalData.milestones && Array.isArray(proposalData.milestones) ? 
            proposalData.milestones.map((m: any) => m.title || m.deliverables).filter(Boolean) : 
            ['Project deliverables to be defined']),
        
        // Common fields
        ipfs_hash: grant_data.ipfs_hash || '',
        category: proposalData.category || grant_data.category || 'general',
        duration_months: proposalData.duration || grant_data.duration_months || 6,
      };

      // Debug logging for data extraction
      if (this.config.agentType === AgentType.BUDGET) {
        console.log(`[${this.config.agentType}] Budget data for grant ${grant_id}:`);
        console.log(`  total_amount: ${payload.total_amount}`);
        console.log(`  budget_items: ${payload.budget_items.length} items`);
        payload.budget_items.forEach((item: any, i: number) => {
          console.log(`    ${i+1}. ${item.category}: $${item.amount} - ${item.description}`);
        });
      } else if (this.config.agentType === AgentType.DUE_DILIGENCE) {
        console.log(`[${this.config.agentType}] Due diligence data for grant ${grant_id}:`);
        console.log(`  github_profiles: ${payload.github_profiles.length} profiles - ${payload.github_profiles.slice(0, 2).join(', ')}`);
        console.log(`  wallet_addresses: ${payload.wallet_addresses.length} addresses - ${payload.wallet_addresses.slice(0, 2).join(', ')}`);
      }

      // Fallback for missing critical fields
      if (this.config.agentType === AgentType.BUDGET && payload.budget_items.length === 0 && payload.total_amount > 0) {
        console.log(`[${this.config.agentType}] Generating default budget item from total amount`);
        payload.budget_items.push({
          category: 'general',
          description: 'Total project budget (breakdown not provided)',
          amount: payload.total_amount,
          quantity: 1
        });
      }
      
      // Check if agent has 70%+ of required fields
      if (!this.hasRequiredFields(payload)) {
        console.log(`[${this.config.agentType}] ⚠️ Insufficient fields for grant ${grant_id}, skipping`);
        this.processing = false;
        return;
      }

      // Call Python AI service
      const response = await axios.post(
        `${this.config.pythonServiceUrl}${this.config.endpoint}`,
        payload,
        {
          timeout: 120000, // 2 minute timeout for AI analysis
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const evaluation = response.data;

      // Extract evaluation data (handle both wrapped and direct formats)
      // Python services return { success: true, result: { ... } }
      const evalData = evaluation.result || evaluation.evaluation || evaluation;
      
      // Convert score from -2 to +2 scale to 0-100 scale
      const rawScore = evalData.score || evalData.budget_score || evalData.risk_score || 0;
      // If score is already 0-100 (like budget/risk scores), use it directly. Otherwise normalize -2 to +2.
      const normalizedScore = (rawScore > 2 || rawScore < -2) ? rawScore : ((rawScore + 2) / 4) * 100;
      
      // Determine vote based on score
      let vote = 'reject';
      if (normalizedScore >= 70) vote = 'approve';
      else if (normalizedScore >= 50) vote = 'conditional';

      // Generate summary if missing (especially for Budget and DD agents)
      let summary = evalData.reasoning || evalData.summary || '';
      
      if (!summary) {
        if (this.config.agentType === AgentType.BUDGET) {
           summary = `Budget Quality: ${evalData.quality_level || 'Unknown'}. `;
           if (evalData.recommendations && evalData.recommendations.length > 0) {
             summary += `Recommendations: ${evalData.recommendations.slice(0, 3).join('; ')}.`;
           }
           if (evalData.red_flags && evalData.red_flags.length > 0) {
             summary += ` Red Flags: ${evalData.red_flags.length} detected.`;
           }
        } else if (this.config.agentType === AgentType.DUE_DILIGENCE) {
           summary = `Risk Level: ${evalData.risk_level || 'Unknown'}. `;
           if (evalData.recommendations && evalData.recommendations.length > 0) {
             summary += `Recommendations: ${evalData.recommendations.slice(0, 3).join('; ')}.`;
           }
           if (evalData.strengths && evalData.strengths.length > 0) {
             summary += ` Strengths: ${evalData.strengths.slice(0, 2).join('; ')}.`;
           }
        }
      }

      // Ensure reasoning is in detailed_analysis for UI consistency
      // The frontend likely looks for 'reasoning' in the detailed_analysis JSON
      if (!evalData.reasoning) {
        evalData.reasoning = summary;
      }
      
      console.log(`[${this.config.agentType}] ✓ Evaluation complete for grant ${grant_id}`);
      console.log(`  Raw Score: ${rawScore.toFixed(2)} | Normalized: ${normalizedScore.toFixed(1)}/100`);
      console.log(`  Vote: ${vote} | Confidence: ${evalData.confidence || 0.5}`);

      // Save evaluation to database
      try {
        const savePayload = {
          grant_id: Number(grant_id),
          agent_name: this.config.agentType,
          score: normalizedScore,
          vote: vote,
          confidence: evalData.confidence || 0.5,
          summary: summary,
          detailed_analysis: evalData,
          strengths: (evalData.strengths || []).map((s: any) => typeof s === 'string' ? s : (s.description || s.strength || JSON.stringify(s))),
          weaknesses: (evalData.weaknesses || []).map((w: any) => typeof w === 'string' ? w : (w.description || w.weakness || JSON.stringify(w))),
          recommendations: (evalData.recommendations || []).map((r: any) => typeof r === 'string' ? r : (r.description || r.recommendation || JSON.stringify(r))),
          red_flags: (evalData.risks || evalData.red_flags || []).map((flag: any) => 
            typeof flag === 'string' ? flag : (flag.flag || flag.description || JSON.stringify(flag))
          ),
          metadata: { 
            raw_score: rawScore,
            raw_response: evaluation,
            agent_type: this.config.agentType
          }
        };

        const saveResponse = await axios.post(
          `${this.config.pythonServiceUrl}/api/v1/evaluations/save`,
          savePayload,
          {
            timeout: 30000, // 30 second timeout for database operations
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (saveResponse.data.success) {
          console.log(`[${this.config.agentType}] ✓ Evaluation saved to database: ${saveResponse.data.evaluation_id}`);
        } else {
          console.warn(`[${this.config.agentType}] Failed to save evaluation: ${saveResponse.data.error}`);
        }
      } catch (saveError: any) {
        console.error(`[${this.config.agentType}] Error saving evaluation:`, saveError.response?.data || saveError.message);
        // Continue anyway - evaluation was completed even if save failed
      }

      // Emit completion event with evaluation results
      this.emit('evaluation:complete', {
        grant_id,
        agent_type: this.config.agentType,
        evaluation,
      });

      // Send VOTE_CAST message to Orchestrator (via Coordinator)
      if (this.communication) {
        await this.communication.sendMessage(
          this.config.agentType,
          'coordinator', // Send to coordinator/orchestrator
          MessageType.VOTE_CAST,
          {
            grant_id: Number(grant_id),
            score: normalizedScore,
            evaluation_id: Date.now(), // Placeholder ID if save failed
            reasoning: summary,
            confidence: evalData.confidence || 0.5
          }
        );
        console.log(`[${this.config.agentType}] Sent VOTE_CAST message`);
      }

    } catch (error: any) {
      // More detailed error logging for debugging
      if (error.response) {
        console.error(`[${this.config.agentType}] Evaluation failed for grant ${grant_id}: ${error.message}`);
        console.error(`[${this.config.agentType}] Response status: ${error.response.status}`);
        if (error.response.data) {
          console.error(`[${this.config.agentType}] Response data:`, JSON.stringify(error.response.data, null, 2));
        }
      } else {
        console.error(`[${this.config.agentType}] Evaluation failed for grant ${grant_id}:`, error.message);
      }
      
      // Emit failure event
      this.emit('evaluation:failed', {
        grant_id,
        agent_type: this.config.agentType,
        error: error.message,
      });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Check if payload has 70%+ of required fields for this agent type
   */
  private hasRequiredFields(payload: any): boolean {
    const requiredFieldsByAgent: Record<string, string[]> = {
      technical: ['grant_id', 'title', 'description', 'timeline', 'tech_stack', 'team_experience', 'architecture'],
      impact: ['grant_id', 'title', 'description', 'objectives', 'target_users', 'expected_outcomes', 'sustainability_plan', 'ecosystem_fit'],
      due_diligence: ['grant_id', 'team_size', 'team_experience', 'github_profiles', 'wallet_addresses'],
      budget: ['grant_id', 'total_amount', 'duration_months', 'budget_items'],
      community: ['grant_id', 'title', 'description', 'category'],
    };
    
    // Critical fields that must be present (100% required)
    const criticalFieldsByAgent: Record<string, string[]> = {
      budget: ['budget_items'], // Budget items are mandatory for budget analysis
      due_diligence: [], // Allow due diligence to run even with missing profiles/addresses
    };
    
    const requiredFields = requiredFieldsByAgent[this.config.agentType] || [];
    if (requiredFields.length === 0) return true; // No requirements, proceed
    
    // Count how many required fields have meaningful values
    let presentCount = 0;
    for (const field of requiredFields) {
      const value = payload[field];
      // Check if field exists and has meaningful content
      if (value !== undefined && value !== null && value !== '' && value !== 'Not specified') {
        // For arrays, check if not empty
        if (Array.isArray(value)) {
          if (value.length > 0) {
            // For budget_items, also validate that items have required fields
            if (field === 'budget_items' && this.config.agentType === 'budget') {
              const validItems = value.filter((item: any) => 
                item && 
                item.category && 
                item.description && 
                item.amount && 
                Number(item.amount) > 0
              );
              if (validItems.length > 0) presentCount++;
            } else {
              presentCount++;
            }
          }
        } else {
          presentCount++;
        }
      }
    }
    
    // Check critical fields first - these must be 100% present
    const criticalFields = criticalFieldsByAgent[this.config.agentType] || [];
    for (const criticalField of criticalFields) {
      const value = payload[criticalField];
      let isCriticalFieldPresent = false;
      
      if (value !== undefined && value !== null && value !== '' && value !== 'Not specified') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            // For budget_items, validate items
            if (criticalField === 'budget_items') {
              const validItems = value.filter((item: any) => 
                item && 
                item.category && 
                item.description && 
                item.amount && 
                Number(item.amount) > 0
              );
              isCriticalFieldPresent = validItems.length > 0;
            } else {
              isCriticalFieldPresent = true;
            }
          }
        } else {
          isCriticalFieldPresent = true;
        }
      }
      
      // If any critical field is missing, fail immediately
      if (!isCriticalFieldPresent) {
        console.log(`[${this.config.agentType}] Critical field '${criticalField}' is missing or invalid`);
        
        // Still log the overall coverage for debugging
        const percentagePresent = (presentCount / requiredFields.length) * 100;
        console.log(`[${this.config.agentType}] Field coverage: ${presentCount}/${requiredFields.length} (${percentagePresent.toFixed(0)}%)`);
        
        const missingFields = requiredFields.filter(field => {
          const val = payload[field];
          if (val === undefined || val === null || val === '' || val === 'Not specified') return true;
          if (Array.isArray(val)) {
            if (val.length === 0) return true;
            // For budget_items, check for valid items
            if (field === 'budget_items' && this.config.agentType === 'budget') {
              const validItems = val.filter((item: any) => 
                item && 
                item.category && 
                item.description && 
                item.amount && 
                Number(item.amount) > 0
              );
              if (validItems.length === 0) return true;
            }
          }
          return false;
        });
        
        if (missingFields.length > 0) {
          console.log(`[${this.config.agentType}] Missing fields: ${missingFields.join(', ')}`);
        }
        
        return false;
      }
    }
    
    const percentagePresent = (presentCount / requiredFields.length) * 100;
    
    // Log detailed field status for debugging
    const missingFields = requiredFields.filter(field => {
      const value = payload[field];
      if (value === undefined || value === null || value === '' || value === 'Not specified') return true;
      if (Array.isArray(value)) {
        if (value.length === 0) return true;
        // For budget_items, check for valid items
        if (field === 'budget_items' && this.config.agentType === 'budget') {
          const validItems = value.filter((item: any) => 
            item && 
            item.category && 
            item.description && 
            item.amount && 
            Number(item.amount) > 0
          );
          if (validItems.length === 0) return true;
        }
      }
      return false;
    });
    
    console.log(`[${this.config.agentType}] Field coverage: ${presentCount}/${requiredFields.length} (${percentagePresent.toFixed(0)}%)`);
    if (missingFields.length > 0) {
      console.log(`[${this.config.agentType}] Missing fields: ${missingFields.join(', ')}`);
    }
    
    return percentagePresent >= 70;
  }

  /**
   * Start listening for messages
   */
  start(communication: any): void {
    console.log(`[${this.config.agentType}] Agent started, listening for evaluation requests`);
    this.communication = communication;

    // Listen for delivered messages destined for this agent
    communication.on('message:delivered', (message: any) => {
      // Check if message is for this agent type
      const isForThisAgent = message.to === this.config.agentType || 
                             (Array.isArray(message.to) && message.to.includes(this.config.agentType));
      
      if (message.message_type === MessageType.EVALUATION_REQUEST && isForThisAgent) {
        console.log(`[${this.config.agentType}] Received evaluation request for grant ${message.data?.grant_id}`);
        this.handleEvaluationRequest(message);
      }
    });
  }

  /**
   * Get agent health status
   */
  getHealth(): { status: 'healthy' | 'unhealthy'; processing: boolean } {
    return {
      status: 'healthy',
      processing: this.processing,
    };
  }
}
