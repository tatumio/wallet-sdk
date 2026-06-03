export type PathParamValue = string | number | boolean;

export function interpolatePath(
  template: string,
  pathParams: Record<string, PathParamValue | null | undefined> | undefined
): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = pathParams?.[key];

    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter "${key}" for ${template}`);
    }

    return encodeURIComponent(String(value));
  });
}
