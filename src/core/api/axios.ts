import axios from 'axios';
import { attachSessionRefresh } from 'src/core/auth/session';

const axiosServices = axios.create();
attachSessionRefresh(axiosServices);

// interceptor for http
axiosServices.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject((error.response && error.response.data) || 'Wrong Services'),
);

export default axiosServices;
