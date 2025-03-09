import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { validateAmazonUrl } from "@/lib/utils";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL").refine(validateAmazonUrl, {
    message: "Please enter a valid Amazon India URL",
  }),
  notifyOnDrop: z.boolean().default(true),
  dropPercentage: z.string().default("60"),
});

type AddProductFormProps = {
  onProductAdded: () => void;
};

export default function AddProductForm({ onProductAdded }: AddProductFormProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      notifyOnDrop: true,
      dropPercentage: "60",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      form.reset();
      setSuccess("Product added to tracking list!");
      onProductAdded();
      
      toast({
        title: "Success!",
        description: "Product has been added to your tracking list",
        duration: 3000,
      });

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "Error adding product",
        description: error instanceof Error ? error.message : "Failed to add product",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values);
  }

  return (
    <section className="mb-8 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Track New Product</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Amazon India Product URL
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input
                      placeholder="Paste Amazon.in link (shortened or full)"
                      className="rounded-r-none"
                      {...field}
                    />
                  </FormControl>
                  <Button 
                    type="submit" 
                    className="rounded-l-none bg-primary-500 hover:bg-primary-600"
                    disabled={isPending}
                  >
                    <span className="material-icons text-sm mr-1">add</span>
                    Track
                  </Button>
                </div>
                <FormMessage />
                {success && (
                  <p className="mt-2 text-sm text-success">{success}</p>
                )}
              </FormItem>
            )}
          />
          
          <div className="flex items-center">
            <FormField
              control={form.control}
              name="notifyOnDrop"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-gray-700">
                    Notify me when price drops by at least
                  </FormLabel>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dropPercentage"
              render={({ field }) => (
                <FormItem>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!form.watch("notifyOnDrop")}
                  >
                    <SelectTrigger className="ml-2 h-8 w-20">
                      <SelectValue placeholder="60%" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="40">40%</SelectItem>
                      <SelectItem value="30">30%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </section>
  );
}
