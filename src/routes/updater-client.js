const sse = new EventSource('/sse');
sse.onopen = () => sse.addEventListener('reload', () => location.reload());
console.log('SSE connection established');
