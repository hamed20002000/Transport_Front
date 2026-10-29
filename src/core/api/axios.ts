import axios from 'axios';
import { attachBusyButtons } from 'src/core/api/busyButtons';
import { attachSessionRefresh } from 'src/core/auth/session';

const axiosServices = axios.create();
attachSessionRefresh(axiosServices);
attachBusyButtons(axiosServices);

// interceptor for http
axiosServices.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject((error.response && error.response.data) || 'Wrong Services'),
);

export default axiosServices;
