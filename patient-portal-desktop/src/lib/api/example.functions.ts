// Example server function disabled for standard SPA migration
export const getGreeting = async (data: { name: string }) => {
  return { greeting: `Hello, ${data.name}!`, mode: "development" };
};
