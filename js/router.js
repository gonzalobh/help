window.HelpinRouter = {
  getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }
};
