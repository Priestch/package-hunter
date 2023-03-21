const http = {
  async get(url, config = {}) {
    const response = await fetch(url, { ...config });
    if (response.ok) {
      if (config.responseType === 'document') {
        const docText = await response.text();
        const parser = new DOMParser();
        return {
          data: parser.parseFromString(docText, 'text/html'),
        };
      }

      return response;
    }
    throw new Error(response.statusText);
  },
};

export default http;
