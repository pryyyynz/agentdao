/**
 * Example agent implementation
 * Use this as a template for creating new agents
 */

import { BaseGrantAgent } from './base-agent';
import { 
  Grant, 
  EvaluationResult, 
  AgentConfig, 
  AgentType,
  EvaluationScore,
  AgentError,
  AgentErrorType 
} from '../types';
import axios from 'axios';

/**
 * Example evaluator agent
 * 
 * This is a template showing how to:
 * 1. Extend BaseGrantAgent
 * 2. Implement the evaluate() method
 * 3. Call Python services
 * 4. Handle errors
 * 5. Return properly formatted results
 */
export class ExampleAgent extends BaseGrantAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  /**
   * Main evaluation logic - implement this for your agent
   */
  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    console.log(`📋 Example Agent - Evaluating grant ${grant.id}`);
    
    // Step 1: Validate grant data
    if (!grant.proposal) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Grant proposal not loaded'
      );
    }

    // Step 2: Log what we're evaluating
    console.log(`Project: ${grant.proposal.projectName}`);
    console.log(`Amount: ${grant.amount} wei`);
    console.log(`Applicant: ${grant.applicant}`);

    // Step 3: Call Python service for analysis
    let analysis;
    try {
      const response = await axios.post(
        `${this.config.pythonApiUrl}/analyze/technical`, // Change endpoint as needed
        {
          grant_id: grant.id,
          project_name: grant.proposal.projectName,
          description: grant.proposal.description,
          tech_stack: grant.proposal.techStack,
          architecture: grant.proposal.architecture,
          timeline: grant.proposal.timeline,
          team_experience: grant.proposal.teamExperience,
          github_repos: grant.proposal.githubRepos
        },
        {
          headers: {
            'X-API-Key': this.config.pythonApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      analysis = response.data;
      console.log(`✅ Analysis received from Python service`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AgentError(
          AgentErrorType.API_ERROR,
          `Python service call failed: ${error.message}`,
          error
        );
      }
      throw new AgentError(
        AgentErrorType.API_ERROR,
        'Unknown error calling Python service',
        error as Error
      );
    }

    // Step 4: Validate analysis response
    if (typeof analysis.score !== 'number') {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Invalid analysis response: missing score'
      );
    }

    if (!analysis.reasoning) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Invalid analysis response: missing reasoning'
      );
    }

    // Step 5: Construct evaluation result
    const result: EvaluationResult = {
      grantId: grant.id,
      agentType: this.agentType,
      score: analysis.score as EvaluationScore,
      reasoning: analysis.reasoning,
      concerns: analysis.concerns || [],
      recommendations: analysis.recommendations || [],
      confidence: analysis.confidence || 0.7,
      timestamp: new Date()
    };

    // Step 6: Log result summary
    console.log(`\n📊 Evaluation Summary:`);
    console.log(`   Score: ${result.score}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Concerns: ${result.concerns?.length || 0}`);
    console.log(`   Recommendations: ${result.recommendations?.length || 0}`);

    return result;
  }

  /**
   * Optional: Add custom helper methods
   */
  private async performCustomAnalysis(grant: Grant): Promise<any> {
    // Add your custom analysis logic here
    return {};
  }

  /**
   * Optional: Override validation if needed
   */
  protected validateEvaluationResult(result: EvaluationResult): void {
    // Call parent validation first
    super.validateEvaluationResult(result);
    
    // Add custom validation here if needed
    // Example: require at least one concern for negative scores
    if (result.score < 0 && (!result.concerns || result.concerns.length === 0)) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Negative scores must include concerns'
      );
    }
  }
}

/**
 * Example usage:
 * 
 * const agent = new ExampleAgent({
 *   agentType: AgentType.TECHNICAL,
 *   blockchain: { ... },
 *   ipfs: { ... },
 *   pythonApiUrl: 'http://localhost:8000',
 *   pythonApiKey: 'your-key'
 * });
 * 
 * const result = await agent.evaluateWithErrorHandling(123);
 */
