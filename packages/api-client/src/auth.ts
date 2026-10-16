import type { ApiClient } from "./client";

export type InvitationInfo = {
  email: string;
  role: string;
  staff_role?: string;
  organization_name?: string;
  organization_type?: string;
};

export type OnboardingRequestBody = {
  type: "hospital" | "pharmacy" | "insurer";
  organization_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  password: string;
};

/** Auth and onboarding endpoints every portal shares. */
export function createAuthApi(client: ApiClient) {
  const { api } = client;

  return {
    invitationApi: {
      info: (token: string) => api<InvitationInfo>(`/api/auth/invitation/${encodeURIComponent(token)}`),
      accept: (token: string, body: { name: string; password: string }) =>
        api<{ ok: boolean }>(`/api/auth/invitation/${encodeURIComponent(token)}/accept`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },

    submitOnboardingRequest: (body: OnboardingRequestBody) =>
      api<{ id: string; status: string }>("/api/onboarding", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    changePasswordApi: async (current_password: string, new_password: string) => {
      const data = await api<{ access_token?: string; refresh_token?: string }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password, new_password }),
      });
      // The server revokes every refresh token on a password change, re-sets the
      // cookie and returns a fresh access token so this session stays signed in.
      client.acceptTokens(data);
      return data;
    },
  };
}
