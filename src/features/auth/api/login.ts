import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

export async function login(username: string, password: string) {
  const { data } = await axios.post<{ success: boolean; data?: string }>(
    `${endpoints.baseurl}${endpoints.login}login`,
    { username, password },
    { timeout: 20000 },
  );
  if (!data.success || typeof data.data !== 'string' || !data.data) {
    throw new Error('نام کاربری یا رمز عبور صحیح نیست.');
  }
  return data.data;
}
