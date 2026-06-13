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
  Grid,
} from "@mui/material";
import forgeLogo from "../assets/FORGE.png";
import loginBg from "../assets/forge_login_background_img.png";

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });
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
      await signUp({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      navigate("/home");
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
        sx={(theme) => ({
          width: "100%",
          maxWidth: 448,
          p: 4,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 4,
          boxShadow: `0 24px 64px ${theme.vars.palette.forge.glowSoft}`,
          "@supports (backdrop-filter: blur(0px))": {
            backgroundColor: `color-mix(in srgb, ${theme.vars.palette.background.paper} 82%, transparent)`,
            backdropFilter: "blur(10px)",
          },
        })}
      >
        <Box mb={2} textAlign="center">
          <img src={forgeLogo} alt="Forge Logo" style={{ height: 36 }} />
        </Box>
        <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.5}>
          Create your account
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Get started with Forge
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Grid container spacing={1.5}>
            <Grid size={6}>
              <TextField
                label="First name"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Ada"
                variant="outlined"
                size="small"
                fullWidth
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Last name"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Lovelace"
                variant="outlined"
                size="small"
                fullWidth
                required
              />
            </Grid>
          </Grid>

          <TextField
            label="Username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="adalovelace"
            variant="outlined"
            size="small"
            fullWidth
            required
          />

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
            placeholder="Min. 6 characters"
            variant="outlined"
            size="small"
            fullWidth
            required
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 0.5, py: 1 }}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" mt={2.5}>
          Already have an account?{" "}
          <Link
            component={RouterLink}
            to="/signin"
            color="primary"
            fontWeight={500}
            underline="hover"
          >
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
