import { useState } from "react";
import SentracoreLanding from "./SentracoreLanding";
import AdminOperationsCenter from "./AdminOperationsCenter";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem("sentracoreAuth"));
  });

  if (!isAuthenticated) {
    return <SentracoreLanding onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <AdminOperationsCenter />;
}

export default App;
