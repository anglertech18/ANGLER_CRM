-- Add enquiry_allocated_to column to enquiries table
-- Foreign key reference to users.id

ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "enquiry_allocated_to" INTEGER;

ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_enquiry_allocated_to_fkey"
    FOREIGN KEY ("enquiry_allocated_to") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
