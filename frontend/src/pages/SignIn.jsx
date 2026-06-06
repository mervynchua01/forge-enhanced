import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
} from "@mui/material";
import forgeLogo from "../assets/FORGE.png";
import loginBg from "../assets/forge_login_background_img.png";

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(formData);
      // navigate('/dashboard')
      //Navigate to workspace after signed in
      navigate("/projects");
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 448,
          p: 4,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <Box mb={3}>
          <img src={forgeLogo} alt="Forge Logo" style={{ height: 40 }} />
        </Box>
        <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.5}>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Sign in to your Forge account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          <TextField
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="ada@example.com"
            variant="outlined"
            size="small"
            fullWidth
            required
          />

          <TextField
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Your password"
            variant="outlined"
            size="small"
            fullWidth
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ mt: 1, py: 1.2, fontWeight: 700, fontSize: "0.95rem" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" mt={2.5}>
          Don&apos;t have an account?{" "}
          <Link
            component={RouterLink}
            to="/signup"
            color="primary"
            fontWeight={500}
            underline="hover"
          >
            Sign up
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
