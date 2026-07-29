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
    };
  };
};
