create table if not exists complaints(
    complaint_id bigint primary key,
    date_received date not null,
    product text not null,
    sub_product text,
    issue text not null,
    sub_issue text,
    narrative text,
    company_public_response text,
    company text not null,
    state text,
    zip_code text,
    tags text,
    submitted_via text,
    date_sent_to_company date,
    company_response_to_consumer text,
    timely_response boolean
)