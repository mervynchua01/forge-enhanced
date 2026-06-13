import Avatar from "@mui/material/Avatar";

function stringToColor(name) {
  let hash = 0;
  let i;
  for (i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function initialsFor(name = "") {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function UserAvatar({ name = "", size = 35 }) {
  return (
    <Avatar
      sx={{
        bgcolor: stringToColor(name),
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {initialsFor(name)}
    </Avatar>
  );
}
