"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type SpaceFormValues,
  spaceFormSchema,
} from "@/lib/schemas/space";

type SpaceFormProps = {
  id?: string;
  defaultValues?: Partial<SpaceFormValues>;
  submitLabel?: string;
  className?: string;
  onSubmit: (values: SpaceFormValues) => void | Promise<void>;
};

export function SpaceForm({
  id = "space-form",
  defaultValues,
  submitLabel = "Create space",
  className,
  onSubmit,
}: SpaceFormProps) {
  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      spaceType: "one_to_one",
      name: "",
      ...defaultValues,
    },
  });

  const spaceType = useWatch({ control: form.control, name: "spaceType" });
  const isGroup = spaceType === "group";

  return (
    <Form {...form}>
      <form
        id={id}
        className={className}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="spaceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Space type</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.clearErrors("name");
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="one_to_one">1:1</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isGroup ? "Group name" : "Label (optional)"}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      isGroup
                        ? "Family promises"
                        : "e.g. Us"
                    }
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {isGroup
                    ? "Shown to members inside this group."
                    : "Optional display name for your 1:1 space."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
