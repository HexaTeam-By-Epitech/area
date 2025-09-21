export async function handleGoogleResponse(response: any) {
  if (!response.credential) return;

  try {
    const res = await fetch('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential }),
    });
    const data = await res.json();
    console.log('Google login success:', data);
  } catch (err) {
    console.error('Google login error:', err);
  }
}

