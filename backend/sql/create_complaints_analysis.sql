-- One row per complaint that has been analyzed by the AI.
-- It works as a cache: a complaint is sent to the LLM only once.
create table if not exists complaint_analysis(
    complaint_id bigint primary key references complaints(complaint_id) on delete cascade,
    category text not null,
    summary text not null,
    model text not null,
    created_at timestamptz not null default now()
);

-- "narrative" = the AI read the customer's written story.
-- "metadata"  = there was no story, so the AI used only the labels
--               (product, sub-product, issue, sub-issue). Less reliable.
-- "add column if not exists" makes this safe on a table that already exists.
alter table complaint_analysis
    add column if not exists basis text not null default 'narrative';

-- Lets us count complaints per AI category quickly (useful for trends later)
create index if not exists idx_complaint_analysis_category on complaint_analysis(category);