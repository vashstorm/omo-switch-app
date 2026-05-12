import * as React from "react";
import { forwardRef } from "react";
import TextField from "@mui/material/TextField";

export interface InputProps extends Omit<React.ComponentProps<"input">, "size" | "color"> {
  "data-testid"?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", "data-testid": dataTestId, ...props }, ref) => {
    return (
      <TextField
        inputRef={ref}
        type={type}
        variant="outlined"
        size="small"
        fullWidth
        inputProps={{
          className,
          "data-testid": dataTestId,
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };