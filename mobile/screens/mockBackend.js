import axios from 'axios';

axios.interceptors.request.use(async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (config.url.endsWith('/auth/login') || config.url.endsWith('/auth/register')) {
    config.adapter = async () => {
      return {
        data: {
          token: 'mocked-token',
          email: JSON.parse(config.data).email,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      };
    };
  }

  return config;
});
