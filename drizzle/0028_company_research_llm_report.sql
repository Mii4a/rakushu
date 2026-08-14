ALTER TABLE company_researches ADD COLUMN website_url text;
--> statement-breakpoint
ALTER TABLE company_researches ADD COLUMN report_json text NOT NULL DEFAULT '{"companyName":"","generatedAt":"","estimatedPages":24,"estimatedFigures":18,"sections":[],"sources":[],"suggestedQuestions":[]}';
--> statement-breakpoint
ALTER TABLE company_researches ADD COLUMN source_chunks_json text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE company_researches ADD COLUMN chat_messages_json text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE company_researches ADD COLUMN model_name text;
--> statement-breakpoint
ALTER TABLE company_researches ADD COLUMN source_count integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE company_researches ADD COLUMN error_code text;
--> statement-breakpoint
ALTER TABLE company_researches ADD COLUMN error_summary text;
--> statement-breakpoint
CREATE INDEX company_researches_website_url_idx ON company_researches(website_url);
