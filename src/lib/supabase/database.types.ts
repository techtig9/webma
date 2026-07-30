export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; email: string; role: "user" | "admin"; created_at: string };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "free" | "starter" | "pro" | "business";
          status: "active" | "past_due" | "canceled" | "paused";
          provider: string;
          paddle_subscription_id: string | null;
          paddle_customer_id: string | null;
          credits_remaining: number;
          credits_allowance: number;
          renews_at: string;
          updated_at: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          template_id: string | null;
          current_version: number;
          status: "draft" | "ready" | "deployed";
          created_at: string;
          updated_at: string;
        };
      };
      project_versions: {
        Row: {
          id: string;
          project_id: string;
          version: number;
          files: Record<string, string>;
          prompt_answers: Record<string, unknown>;
          created_at: string;
        };
      };
      deployments: {
        Row: {
          id: string;
          project_id: string;
          provider: "vercel" | "netlify";
          deployment_url: string | null;
          status: "queued" | "building" | "ready" | "error";
          logs: string | null;
          created_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          paddle_transaction_id: string;
          amount: number;
          currency: string;
          status: string;
          created_at: string;
        };
      };
      templates: {
        Row: {
          id: string;
          category: string;
          name: string;
          thumbnail: string | null;
          tier_required: string;
          structure: Record<string, unknown>;
          created_at: string;
        };
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          credits_delta: number;
          cache_hit: boolean;
          project_id: string | null;
          created_at: string;
        };
      };
      custom_domains: {
        Row: {
          id: string;
          project_id: string;
          domain: string;
          status: "pending" | "verifying" | "active" | "failed";
          verification_token: string;
          provider_domain_id: string | null;
          created_at: string;
          verified_at: string | null;
        };
      };
      deploy_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: "vercel" | "netlify";
          access_token: string;
          refresh_token: string | null;
          expires_at: string | null;
          provider_account_email: string | null;
          created_at: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "member";
          invited_email: string | null;
          accepted_at: string | null;
          created_at: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: string;
          action: string;
          target_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
      };
      ai_response_cache: {
        Row: {
          cache_key: string;
          task: string;
          response: string;
          created_at: string;
        };
      };
    };
  };
};
