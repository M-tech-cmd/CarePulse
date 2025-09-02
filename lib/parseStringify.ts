// /lib/utils/parseStringify.ts
export const parseStringify = (value: any) => {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
};
