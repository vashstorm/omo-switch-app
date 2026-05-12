import * as React from "react";
import { forwardRef } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  "data-testid"?: string;
}

const getMuiButtonProps = (variant: ButtonVariant = "default", size: ButtonSize = "default") => {
  if (size === "icon") {
    return {
      isIconButton: true,
    };
  }

  const muiSize: "small" | "medium" | "large" = size === "sm" ? "small" : size === "lg" ? "large" : "medium";

  switch (variant) {
    case "default":
      return {
        variant: "contained" as const,
        size: muiSize,
      };
    case "destructive":
      return {
        variant: "contained" as const,
        color: "error" as const,
        size: muiSize,
      };
    case "outline":
      return {
        variant: "outlined" as const,
        size: muiSize,
      };
    case "secondary":
      return {
        variant: "outlined" as const,
        color: "secondary" as const,
        size: muiSize,
      };
    case "ghost":
      return {
        variant: "text" as const,
        size: muiSize,
      };
    case "link":
      return {
        variant: "text" as const,
        size: muiSize,
        sx: { textDecoration: "underline", "&:hover": { textDecoration: "underline" } },
      };
    default:
      return {
        variant: "contained" as const,
        size: muiSize,
      };
  }
};

const ButtonComponent = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className, asChild, children, "data-testid": dataTestId, ...props }, ref) => {
    const muiProps = getMuiButtonProps(variant, size);

    if (muiProps.isIconButton) {
      return (
        <IconButton
          ref={ref as any}
          className={className}
          data-testid={dataTestId}
          {...props}
        >
          {children}
        </IconButton>
      );
    }

    const { sx, ...restMuiProps } = muiProps as any;

    return (
      <Button
        ref={ref}
        className={className}
        data-testid={dataTestId}
        {...restMuiProps}
        {...props}
        sx={sx}
      >
        {children}
      </Button>
    );
  }
);

ButtonComponent.displayName = "Button";

export { ButtonComponent as Button };