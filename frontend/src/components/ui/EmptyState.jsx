import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Centered placeholder for empty lists/columns.
export default function EmptyState({ icon, title, caption, sx }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 0.5,
        py: 4,
        color: "text.secondary",
        ...sx,
      }}
    >
      {icon}
      {title ? (
        <Typography variant="body2" fontWeight={600}>
          {title}
        </Typography>
      ) : null}
      {caption ? (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      ) : null}
    </Box>
  );
}
