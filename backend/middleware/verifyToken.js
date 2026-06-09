const { supabaseAdmin } = require("../lib/supabase");

// DEV BYPASS — remove before deploying
const DEV_BYPASS = true;
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

const verifyToken = async (req, res, next) => {
  if (DEV_BYPASS) {
    req.user = { userId: DEV_USER_ID, email: "dev@forge.local" };
    return next();
  }

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

module.exports = verifyToken;
