import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "@/components/StarRating";
import { useAuth } from "@/contexts/AuthContext";
import { testimonialStore } from "@/data/testimonialStore";
import { toast } from "sonner";
import { MessageSquareHeart } from "lucide-react";

const RatePlatform = () => {
  const { user } = useAuth();
  const orgName = user?.organization?.split(" - ")[0] ?? "";
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!role.trim()) {
      toast.error("Please enter your role");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please add a comment");
      return;
    }
    testimonialStore.add({
      name: name.trim(),
      role: `${role.trim()}, ${orgName}`,
      rating,
      text: comment.trim(),
    });
    setSubmitted(true);
    toast.success("Thank you for your feedback!");
  };

  if (submitted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center space-y-2">
          <MessageSquareHeart className="h-8 w-8 text-primary mx-auto" />
          <p className="font-semibold text-foreground">Thanks for rating TrainHub!</p>
          <p className="text-sm text-muted-foreground">Your review is now visible on our landing page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Rate TrainHub</h3>
        </div>
        <p className="text-sm text-muted-foreground">Share your experience to help other learners.</p>
        <StarRating value={rating} onChange={setRating} />
        <Textarea
          placeholder="Tell us what you think..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
        <Button onClick={handleSubmit} className="w-full">Submit Review</Button>
      </CardContent>
    </Card>
  );
};

export default RatePlatform;
