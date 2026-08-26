import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI-powered search input. Submits a natural-language query.
 */
export function NLSearchBar({
  onSearch,
  loading,
  placeholder = "Try: Remote DevOps jobs in Germany under 3 years",
  className,
}: {
  onSearch: (q: string) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
      }}
      className={cn(
        "group relative flex items-center gap-2 rounded-xl border border-border bg-elevated px-3 py-2 transition-colors focus-within:border-primary/50",
        className,
      )}
    >
      <motion.span
        aria-hidden
        animate={{ rotate: loading ? 360 : 0 }}
        transition={{ duration: 1.6, repeat: loading ? Infinity : 0, ease: "linear" }}
        className="text-primary"
      >
        {loading ? <Loader2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </motion.span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm"
        >
          Search
        </button>
      )}
    </form>
  );
}
