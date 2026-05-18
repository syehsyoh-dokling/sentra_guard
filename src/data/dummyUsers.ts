export type DummyUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin";
};

export const dummyUsers: DummyUser[] = [
  {
    id: "danandad-admin-001",
    name: "Dan&Dad Admin",
    email: "admin@danandad.com",
    password: "@dan&dad#2025",
    role: "admin"
  }
];

export function findDummyUser(email: string, password: string): DummyUser | null {
  return (
    dummyUsers.find(
      (user) =>
        user.email.toLowerCase() === email.trim().toLowerCase() &&
        user.password === password
    ) ?? null
  );
}
