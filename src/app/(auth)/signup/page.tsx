import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account · Life Ledger" };

export default function Signup() {
  return <AuthForm mode="signup" />;
}
