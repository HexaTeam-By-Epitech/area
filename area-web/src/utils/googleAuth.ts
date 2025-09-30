import useAuthStore from "@/stores/webauth";

export async function handleGoogleResponse(response: any) {
  if (!response.credential) return;

  try {
    const res = await fetch('/auth/Google/login', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // body: JSON.stringify({ token: response.credential }),
    });

    const data = await res.json();
    console.log(data);
    if (data.userId) {
      const authStore = useAuthStore();
      authStore.login(data.email, data.userId);
    }
    console.log('Google login success:', data);
  } catch (err) {
    console.error('Google login error:', err);
  }
}
