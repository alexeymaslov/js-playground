-- Table: public.events

-- DROP TABLE public.events;

CREATE TABLE public.events
(
    id integer NOT NULL DEFAULT nextval('events_id_seq'::regclass),
    data jsonb NOT NULL,
    CONSTRAINT events_pkey PRIMARY KEY (id)
)

--TABLESPACE pg_default;

--ALTER TABLE public.events
--    OWNER to postgres;