type DeploymentEnv = {
  DEV?: boolean;
  PROD?: boolean;
};

export function shouldExposeDebugRoutes(env: DeploymentEnv): boolean {
  return Boolean(env.DEV && !env.PROD);
}
