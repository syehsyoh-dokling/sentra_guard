import users from "../data/dummy-users.json";

export interface User {
  email: string;
  password: string;
  role: string;
  name: string;
}

export function login(
  email: string,
  password: string
): User | null {

  const found =
    (users as User[]).find(
      (user) =>
        user.email === email &&
        user.password === password
    );

  if (!found) {
    return null;
  }

  localStorage.setItem(
    "sentracoreAuth",
    JSON.stringify(found)
  );

  return found;
}

export function getSession() {

  const raw =
    localStorage.getItem(
      "sentracoreAuth"
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {

  localStorage.removeItem("sentracoreAuth");
  localStorage.removeItem("sentracore-session");
}
