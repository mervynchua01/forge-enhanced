import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      await signOut();
      navigate("/signin");
    };

    run();
  }, [navigate, signOut]);

  // return (
  //   <Box
  //     sx={{
  //       minHeight: "100vh",
  //       display: "flex",
  //       alignItems: "center",
  //       justifyContent: "center",
  //       bgcolor: "background.default",
  //     }}
  //   >
  //     <Box textAlign="center">
  //       <Typography variant="h5" fontWeight={600} color="grey.900" mb={1}>
  //         Welcome, {user?.firstName}
  //       </Typography>
  //       <Typography variant="body2" color="text.secondary" mb={3}>
  //         You&apos;re signed in to Forge.
  //       </Typography>
  //       <Button variant="contained" color="primary" onClick={handleSignOut}>
  //         Sign out
  //       </Button>
  //     </Box>
  //   </Box>
  // );
}
