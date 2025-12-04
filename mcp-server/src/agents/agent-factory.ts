/**
 * Agent Factory - Creates evaluator agents for each type
 */
import { EvaluatorAgent, EvaluatorConfig } from './evaluator-agent.js';
import { AgentType } from '../types.js';

export class AgentFactory {
  private pythonServiceUrl: string;

  constructor(pythonServiceUrl: string = 'http://localhost:8000') {
    this.pythonServiceUrl = pythonServiceUrl;
  }

  /**
   * Create all evaluator agents
   */
  createEvaluators(): Map<AgentType, EvaluatorAgent> {
    const agents = new Map<AgentType, EvaluatorAgent>();

    // Technical Evaluator
    agents.set(
      AgentType.TECHNICAL,
      new EvaluatorAgent({
        agentType: AgentType.TECHNICAL,
        pythonServiceUrl: this.pythonServiceUrl,
        endpoint: '/api/v1/analyze/technical',
      })
    );

    // Impact Evaluator
    agents.set(
      AgentType.IMPACT,
      new EvaluatorAgent({
        agentType: AgentType.IMPACT,
        pythonServiceUrl: this.pythonServiceUrl,
        endpoint: '/api/v1/analyze/impact',
      })
    );

    // Due Diligence Evaluator
    agents.set(
      AgentType.DUE_DILIGENCE,
      new EvaluatorAgent({
        agentType: AgentType.DUE_DILIGENCE,
        pythonServiceUrl: this.pythonServiceUrl,
        endpoint: '/api/v1/analyze/due-diligence',
      })
    );

    // Budget Evaluator
    agents.set(
      AgentType.BUDGET,
      new EvaluatorAgent({
        agentType: AgentType.BUDGET,
        pythonServiceUrl: this.pythonServiceUrl,
        endpoint: '/api/v1/analyze/budget',
      })
    );

    // Community Evaluator - uses impact endpoint for sentiment
    agents.set(
      AgentType.COMMUNITY,
      new EvaluatorAgent({
        agentType: AgentType.COMMUNITY,
        pythonServiceUrl: this.pythonServiceUrl,
        endpoint: '/api/v1/analyze/impact', // Community uses impact for sentiment analysis
      })
    );

    return agents;
  }
}
