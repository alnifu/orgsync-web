// App.tsx
import Signup from "./pages/Signup";

function App() {
  const handleSignupSuccess = (user: any) => {
    console.log("Signed up:", user);
    // Example: redirect, or save extra profile data
    // navigate("/dashboard") or insert into "profiles" table
  };

  return (
    <div className="p-6">
      <h1>Welcome to My App</h1>
      <Signup onSignupSuccess={handleSignupSuccess} />
    </div>
  );
}

export default App;