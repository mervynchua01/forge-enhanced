import { supabaseAdmin, supabaseAuth } from "../lib/supabase.js";

const mapUser = (row) => ({
  _id: row.id,
  username: row.username,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  role: row.role,
});

const signup = async (req, res) => {
  try {
    const { username, firstName, lastName, email, password } = req.body;

    if (!username || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ message: existingError.message });
    }

    if (existing) {
      return res.status(400).json({ message: "Username or email already taken." });
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error || !data?.user) {
      return res.status(400).json({ message: error?.message || "Signup failed." });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: data.user.id,
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        role: "user",
      })
      .select("id, username, first_name, last_name, email, role")
      .single();

    if (profileError) {
      return res.status(500).json({ message: profileError.message });
    }

    return res.status(201).json({
      token: data.session?.access_token || null,
      user: mapUser(profile),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      return res.status(401).json({ message: error?.message || "Invalid email or password." });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id, username, first_name, last_name, email, role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ message: profileError.message });
    }

    return res.status(200).json({
      token: data.session.access_token,
      user: mapUser(profile),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const signout = async (req, res) => {
  return res.status(200).json({ message: "Signed out successfully." });
};

export { signup, signin, signout };
