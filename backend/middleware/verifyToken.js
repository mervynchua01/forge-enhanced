import { supabaseAdmin } from "../lib/supabase.js";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  req.user = {
    userId: data.user.id,
    email: data.user.email,
  };

  return next();
};

export default verifyToken;
