import useAuthStore from "@/stores/webauth";
import { ref } from 'vue';

// Shared state for Google Sign-In feedback
export const googleLoading = ref(false);
export const googleError = ref('');
export const googleSuccess = ref('');

export async function handleGoogleResponse(response: any) {
  if (!response.credential) {
    googleError.value = 'No credential received from Google';
    return;
  }

  googleLoading.value = true;
  googleError.value = '';
  googleSuccess.value = '';

  try {
    // Use absolute backend URL in production, relative in dev (for proxy)
    const baseUrl = import.meta.env.PROD ? import.meta.env.VITE_API_URL || '' : '';
    const res = await fetch(`${baseUrl}/auth/google/id-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData.message || 'Google login failed';

      // Log full error for debugging
      console.error('Google login error response:', errorData);

      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log('Google login response:', data);

    if (data.accessToken && data.userId) {
      const authStore = useAuthStore();
      authStore.login(data.email, data.accessToken, data.userId);
      googleSuccess.value = 'Successfully logged in with Google!';

      // Clear success message after 2 seconds
      setTimeout(() => {
        googleSuccess.value = '';
      }, 2000);
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (err) {
    console.error('Google login error:', err);
    googleError.value = err instanceof Error ? err.message : 'Failed to login with Google';

    // Clear error message after 5 seconds
    setTimeout(() => {
      googleError.value = '';
    }, 5000);
  } finally {
    googleLoading.value = false;
  }
}
