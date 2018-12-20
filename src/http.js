import axios from 'axios';

const http = axios.create({
  timeout: 30 * 1e3,
});

axios.defaults.headers.common.Accept = 'application/json';

http.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // console.log(error.response.data);
      // console.log(error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      // console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      // console.log('Error', error.message);
    }
    // console.log(error.config);
    return Promise.reject(error);
  },
);

export default http;
