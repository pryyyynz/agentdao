"use client";

import { PageLayout } from "@/components/PageLayout";
import { useDashboardStats } from "@/hooks/useApi";
import { 
  Sparkles, 
  Shield, 
  Zap, 
  TrendingUp, 
  Users, 
  Code, 
  ArrowRight,
  Globe,
  Cpu,
  Target,
  DollarSign,
  MessageSquare
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <PageLayout
      title="Decentralized Grant Funding"
      description="AI-Powered. Transparent. Autonomous."
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-cyan-600 to-teal-700 rounded-2xl shadow-2xl p-12 mb-12 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8" />
            <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
              Next-Gen Grant Platform
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Where Innovation Meets<br />Autonomous Funding
          </h1>
          <p className="text-xl text-cyan-100 mb-8 max-w-2xl">
            Five specialized AI agents collaborate to evaluate every proposal with unprecedented 
            thoroughness. No human bias, no delays—just intelligent, data-driven decisions.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/submit"
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold hover:bg-cyan-50 transition-all hover:scale-105 shadow-lg flex items-center gap-2"
            >
              Submit Your Project
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pipeline"
              className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-all flex items-center gap-2"
            >
              Explore Pipeline
            </Link>
          </div>
        </div>
      </div>

      {/* Live Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-3xl font-bold mb-1">
            {isLoading ? "..." : stats?.total_grants || 0}
          </div>
          <div className="text-indigo-100 text-sm font-medium">Total Proposals</div>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-3xl font-bold mb-1">
            {isLoading ? "..." : stats?.approved_grants || 0}
          </div>
          <div className="text-teal-100 text-sm font-medium">Projects Funded</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-3xl font-bold mb-1">
            {isLoading ? "..." : `${stats?.total_funded || "0"}`}
          </div>
          <div className="text-cyan-100 text-sm font-medium">ETH Distributed</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-3xl font-bold mb-1">
            {isLoading ? "..." : stats?.pending_grants || 0}
          </div>
          <div className="text-indigo-100 text-sm font-medium">Under Review</div>
        </div>
      </div>

      {/* The AI Agent Council */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Cpu className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-gray-900">
            Meet Your Evaluators
          </h2>
        </div>
        <p className="text-gray-600 mb-8 text-lg">
          Five specialized AI agents form an expert council to review every proposal
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-indigo-500 transition-all">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Code className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Technical Analyst
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Deep-dives into technical architecture, code quality, security considerations, 
                and feasibility of implementation. Ensures projects are technically sound.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-teal-500 transition-all">
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Impact Evaluator
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Assesses potential reach, community benefit, ecosystem impact, and long-term 
                value creation. Prioritizes projects that make meaningful change.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-cyan-500 transition-all">
              <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Due Diligence Officer
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Verifies team credentials, financial projections, milestone realism, and risk 
                factors. Guards against fraud and ensures responsible fund allocation.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-emerald-500 transition-all">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Budget Analyst
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Reviews financial planning, cost estimates, resource allocation, and ROI projections. 
                Ensures funds are used efficiently and budgets are realistic.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-purple-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-purple-500 transition-all">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Community Analyst
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Gauges community support, engagement levels, and social sentiment. Measures 
                grassroots backing and validates genuine community interest.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Grantify */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl shadow-xl p-8 mb-12 text-white">
        <h2 className="text-3xl font-bold mb-8">Why Grantify?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="bg-cyan-500/20 rounded-lg p-3 h-fit">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Lightning Fast Reviews</h3>
              <p className="text-gray-300 text-sm">
                AI agents evaluate proposals in minutes, not weeks. Get funding decisions 
                when you need them, not when bureaucracy allows.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-indigo-500/20 rounded-lg p-3 h-fit">
              <Globe className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Radically Transparent</h3>
              <p className="text-gray-300 text-sm">
                Every evaluation, vote, and decision is recorded on-chain. Watch the AI 
                agents deliberate in real-time. No black boxes.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-teal-500/20 rounded-lg p-3 h-fit">
              <Shield className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Bias-Free Decisions</h3>
              <p className="text-gray-300 text-sm">
                No favoritism, no politics, no "who you know." Every proposal judged 
                purely on merit by objective AI analysis.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-emerald-500/20 rounded-lg p-3 h-fit">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Milestone-Based Funding</h3>
              <p className="text-gray-300 text-sm">
                Funds released as you hit milestones, not upfront. Smart contracts ensure 
                accountability and reduce risk for everyone.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl shadow-2xl p-10 text-center text-white">
        <Users className="w-16 h-16 mx-auto mb-4 opacity-90" />
        <h2 className="text-3xl font-bold mb-4">Ready to Build the Future?</h2>
        <p className="text-cyan-100 text-lg mb-8 max-w-2xl mx-auto">
          Join the pioneers building on Grantify. Whether you're a solo developer or 
          an established team, our AI council is ready to evaluate your vision.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/submit"
            className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold hover:bg-cyan-50 transition-all hover:scale-105 shadow-lg inline-flex items-center gap-2"
          >
            Start Your Application
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/activity"
            className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-all inline-flex items-center gap-2"
          >
            Watch Agents Live
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}

