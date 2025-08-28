import client from 'prom-client';
export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const igOutMessages = new client.Counter({ name:'ig_out_messages_total', help:'IG out msgs', registers:[register] });
export const igErrors = new client.Counter({ name:'ig_errors_total', help:'IG errors', registers:[register] });
