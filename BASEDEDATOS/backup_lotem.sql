--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: achievements_criteriatype_enum; Type: TYPE; Schema: public; Owner: lotem_owner
--

CREATE TYPE public.achievements_criteriatype_enum AS ENUM (
    'item_purchase_count',
    'specific_item_purchased'
);


ALTER TYPE public.achievements_criteriatype_enum OWNER TO lotem_owner;

--
-- Name: achievements_rewardtype_enum; Type: TYPE; Schema: public; Owner: lotem_owner
--

CREATE TYPE public.achievements_rewardtype_enum AS ENUM (
    'credits',
    'item'
);


ALTER TYPE public.achievements_rewardtype_enum OWNER TO lotem_owner;

--
-- Name: friendships_status_enum; Type: TYPE; Schema: public; Owner: lotem_owner
--

CREATE TYPE public.friendships_status_enum AS ENUM (
    'pending',
    'accepted',
    'declined',
    'blocked'
);


ALTER TYPE public.friendships_status_enum OWNER TO lotem_owner;

--
-- Name: posts_status_enum; Type: TYPE; Schema: public; Owner: lotem_owner
--

CREATE TYPE public.posts_status_enum AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE public.posts_status_enum OWNER TO lotem_owner;

--
-- Name: posts_type_enum; Type: TYPE; Schema: public; Owner: lotem_owner
--

CREATE TYPE public.posts_type_enum AS ENUM (
    'news',
    'tweet',
    'update',
    'event'
);


ALTER TYPE public.posts_type_enum OWNER TO lotem_owner;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: lotem_owner
--

CREATE TYPE public.users_role_enum AS ENUM (
    'user',
    'editor',
    'admin'
);


ALTER TYPE public.users_role_enum OWNER TO lotem_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.achievements (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    "criteriaType" public.achievements_criteriatype_enum NOT NULL,
    "criteriaThreshold" integer,
    "criteriaTargetId" character varying,
    "rewardType" public.achievements_rewardtype_enum NOT NULL,
    "rewardValue" integer,
    "rewardCatalogItemId" character varying,
    "iconUrl" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "rewardItemId" uuid
);


ALTER TABLE public.achievements OWNER TO lotem_owner;

--
-- Name: catalog_items; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.catalog_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    "assetKey" character varying(100) NOT NULL,
    price integer NOT NULL,
    category character varying(50) DEFAULT 'decoration'::character varying NOT NULL,
    "dimensionsGrid" jsonb,
    "isPlaceableInRoom" boolean DEFAULT true NOT NULL,
    tags text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "isStackableInInventory" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.catalog_items OWNER TO lotem_owner;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "postId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "contentText" text NOT NULL,
    "parentId" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    mpath character varying DEFAULT ''::character varying
);


ALTER TABLE public.comments OWNER TO lotem_owner;

--
-- Name: friendships; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.friendships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId1" uuid NOT NULL,
    "userId2" uuid NOT NULL,
    status public.friendships_status_enum DEFAULT 'pending'::public.friendships_status_enum NOT NULL,
    "requestedByUserId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.friendships OWNER TO lotem_owner;

--
-- Name: likes; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.likes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "postId" uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.likes OWNER TO lotem_owner;

--
-- Name: player_characters; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.player_characters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    x integer DEFAULT 50 NOT NULL,
    y integer DEFAULT 450 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "userId" uuid,
    "bodyStyle" character varying(100) DEFAULT 'male_base_white'::character varying NOT NULL,
    "hairStyle" character varying(100) DEFAULT 'default_hair'::character varying NOT NULL,
    "shirtStyle" character varying(100) DEFAULT 'default_shirt'::character varying NOT NULL,
    "pantsStyle" character varying(100) DEFAULT 'default_pants'::character varying NOT NULL,
    "currentRoomId" uuid
);


ALTER TABLE public.player_characters OWNER TO lotem_owner;

--
-- Name: player_inventory_items; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.player_inventory_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "catalogItemId" uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "acquiredAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.player_inventory_items OWNER TO lotem_owner;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.posts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "authorId" uuid NOT NULL,
    title character varying(255),
    "contentText" text NOT NULL,
    "imageUrl" character varying(2048),
    type public.posts_type_enum DEFAULT 'tweet'::public.posts_type_enum NOT NULL,
    status public.posts_status_enum DEFAULT 'draft'::public.posts_status_enum NOT NULL,
    "publishedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "likeCount" integer DEFAULT 0 NOT NULL,
    "commentCount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.posts OWNER TO lotem_owner;

--
-- Name: private_chat_messages; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.private_chat_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "friendshipId" uuid NOT NULL,
    "senderId" uuid NOT NULL,
    "senderUsername" character varying NOT NULL,
    "receiverId" uuid NOT NULL,
    "messageText" text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "messageType" character varying DEFAULT 'text'::character varying NOT NULL,
    "imageUrl" character varying(2048)
);


ALTER TABLE public.private_chat_messages OWNER TO lotem_owner;

--
-- Name: room_placed_items; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.room_placed_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "roomId" uuid NOT NULL,
    "catalogItemId" uuid NOT NULL,
    "placedByUserId" uuid NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL,
    rotation integer DEFAULT 0 NOT NULL,
    "zIndex" integer DEFAULT 0,
    "instanceProperties" jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.room_placed_items OWNER TO lotem_owner;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.rooms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    "hostUserId" uuid NOT NULL,
    status character varying(20) DEFAULT 'waiting'::character varying NOT NULL,
    "maxPlayers" integer DEFAULT 4 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rooms OWNER TO lotem_owner;

--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "achievementId" character varying NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    "isUnlocked" boolean DEFAULT false NOT NULL,
    "unlockedAt" timestamp with time zone,
    "isRewardClaimed" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_achievements OWNER TO lotem_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: lotem_owner
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verificationToken" character varying,
    "passwordResetToken" character varying,
    "passwordResetExpires" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "currencyBalance" integer DEFAULT 100 NOT NULL,
    role public.users_role_enum DEFAULT 'user'::public.users_role_enum NOT NULL
);


ALTER TABLE public.users OWNER TO lotem_owner;

--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.achievements (id, name, description, "criteriaType", "criteriaThreshold", "criteriaTargetId", "rewardType", "rewardValue", "rewardCatalogItemId", "iconUrl", "isActive", "createdAt", "rewardItemId") FROM stdin;
BUY_2_ITEMS	Comprador Entusiasta	Realiza 2 compras en la tienda.	item_purchase_count	2	\N	credits	100	\N	/assets/achievements/buyer_enthusiast.png	t	2025-06-04 10:36:58.152954	\N
\.


--
-- Data for Name: catalog_items; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.catalog_items (id, name, description, "assetKey", price, category, "dimensionsGrid", "isPlaceableInRoom", tags, "createdAt", "updatedAt", "isStackableInInventory") FROM stdin;
60ce6a2c-5abb-42bd-a898-b4cda68178da	TX Prop 0	Elemento decorativo TX Prop 0	TX Props-0	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
d1dd77a4-8d40-4672-99cd-ea0bbb1b0a7c	TX Prop 1	Elemento decorativo TX Prop 1	TX Props-1	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
e411b900-df94-47e0-a40f-62b7d9f67bb5	TX Prop 69	Elemento decorativo TX Prop 69	TX Props-69	10	Decoraci├│n	{"width": 5, "height": 5}	t	\N	2025-06-05 07:27:10.791009+00	2025-06-05 07:27:10.791009+00	t
369615bc-287e-449e-b12a-d5eeb3a42c67	Arbol Di Noa	Arbolito que trae buena suerte	forest_tree	100	Bosque	{"width": 60, "height": 120}	t	Bosque, Arbol	2025-06-01 14:16:45.050418+00	2025-06-01 14:16:45.050418+00	t
5140faad-87df-407e-ba5c-d44b61de0c63	TX Prop 2	Elemento decorativo TX Prop 2	TX Props-2	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
f2c6fa8b-1045-4f0f-a758-4f711ee3463b	Estacion de cocina rural	Estacion de cocina rural para los mas rusticos	cooking_station2	75	Cocina	{"width": 100, "height": 80}	t	{lampara,iluminacion,clasico,decoracion}	2025-06-01 14:17:32.049922+00	2025-06-01 14:17:32.049922+00	t
5e420258-58fe-42dd-bf07-4ffed637cfe6	TileSet Grass	test	tileset_grass	1	Bosque, Suelo	{"width": 5, "height": 5}	t	Suelo, bosque, rural	2025-06-05 06:54:56.266513+00	2025-06-05 06:54:56.266513+00	t
26e1ea91-39d5-4478-8df0-7e0277258601	Suelo natural 2	Un suelo natural donde se pasea la tranquilidad	tileset_grass2	10	Suelo	{"width": 8, "height": 8}	t	\N	2025-06-05 06:58:47.092198+00	2025-06-05 06:58:47.092198+00	t
8a69cff5-da8b-4529-9092-4ffb211f8708	Suelo natural 3	Un suelo natural donde se pasea la tranquilidad	tileset_grass3	10	Suelo	{"width": 8, "height": 8}	t	\N	2025-06-05 07:08:42.141768+00	2025-06-05 07:08:42.141768+00	t
5b8ba547-2bc5-4a4a-b70f-da47a2dac72b	Suelo natural 4	Un suelo natural donde se pasea la tranquilidad	tileset_grass4	10	Suelo	{"width": 8, "height": 8}	t	\N	2025-06-05 07:08:42.141768+00	2025-06-05 07:08:42.141768+00	t
6bd13610-8ac6-4b2d-9590-5fd46a5b3285	Suelo natural 5	Un suelo natural donde se pasea la tranquilidad	tileset_grass5	10	Suelo	{"width": 8, "height": 8}	t	\N	2025-06-05 07:08:42.141768+00	2025-06-05 07:08:42.141768+00	t
74c3c60b-2d19-443c-a8d0-a0922af8cef1	Suelo natural 6	Un suelo natural donde se pasea la tranquilidad	tileset_grass6	10	Suelo	{"width": 8, "height": 8}	t	\N	2025-06-05 07:08:42.141768+00	2025-06-05 07:08:42.141768+00	t
28837d36-8b00-4142-979c-3ab55d449c8e	TX Prop 3	Elemento decorativo TX Prop 3	TX Props-3	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
787b99f2-fab1-4816-8539-d2f682a8368f	TX Prop 4	Elemento decorativo TX Prop 4	TX Props-4	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
95117ecb-903e-48fa-9607-6d634995c5b5	TX Prop 5	Elemento decorativo TX Prop 5	TX Props-5	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
50214ac1-ff57-4c07-89b0-c989a14e0534	TX Prop 6	Elemento decorativo TX Prop 6	TX Props-6	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
ab6a3f8d-99fb-430a-9d24-aba582b93634	TX Prop 7	Elemento decorativo TX Prop 7	TX Props-7	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
88efd20d-fec8-47ee-bb4d-d98189ce2976	TX Prop 8	Elemento decorativo TX Prop 8	TX Props-8	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
60cdff40-5a1a-4a84-9a19-4b20bfdd55d7	TX Prop 9	Elemento decorativo TX Prop 9	TX Props-9	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
69716d5f-30dc-4e95-90e3-e22310a09568	TX Prop 10	Elemento decorativo TX Prop 10	TX Props-10	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
4464ab4b-c34c-4fda-88cc-726f888d1c9b	TX Prop 11	Elemento decorativo TX Prop 11	TX Props-11	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
cb3d8af1-367c-42b4-8edc-07813906ca15	TX Prop 12	Elemento decorativo TX Prop 12	TX Props-12	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
35f598e9-cb93-47ac-a5ef-2558ebf864db	TX Prop 13	Elemento decorativo TX Prop 13	TX Props-13	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
d7c7f40e-0893-48ae-a189-4acb71952ac6	Puente Ovejuna	Entrada del puente antiguo	puente	20	Decoraci├│n, Puente	{"width": 15, "height": 15}	t	\N	2025-06-05 07:44:42.563845+00	2025-06-05 07:44:42.563845+00	t
9c9b16db-12ab-435d-ae0d-e4310e0b743d	TX Prop 28	Elemento decorativo TX Prop 28	TX Props-28	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
67ae2c43-3bc1-49a0-ac7d-09fe0254956f	TX Prop 29	Elemento decorativo TX Prop 29	TX Props-29	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
de6e66ec-1aa9-427a-9564-75d3c2b2fca1	TX Prop 30	Elemento decorativo TX Prop 30	TX Props-30	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
2cfa587b-4284-44a0-b4d5-440518d84923	TX Prop 31	Elemento decorativo TX Prop 31	TX Props-31	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
44369f30-9ce4-43fb-a3b8-54162a707156	TX Prop 32	Elemento decorativo TX Prop 32	TX Props-32	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
dd2805d5-24c0-4bee-b621-822afaf558d5	TX Prop 33	Elemento decorativo TX Prop 33	TX Props-33	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
0572069a-73b2-4de2-ae3d-cc3ab73c6e1c	TX Prop 34	Elemento decorativo TX Prop 34	TX Props-34	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
d2ff673e-4c7a-467f-b997-f191f5e004bf	TX Prop 35	Elemento decorativo TX Prop 35	TX Props-35	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
22fcde0b-e0ab-4d21-a590-38e64d5feca0	TX Prop 36	Elemento decorativo TX Prop 36	TX Props-36	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
e98b8bf8-d6d2-4fe4-91e9-3894ebe6799f	TX Prop 37	Elemento decorativo TX Prop 37	TX Props-37	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
594fb677-26d3-44bf-af74-f75b93432349	TX Prop 38	Elemento decorativo TX Prop 38	TX Props-38	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
0f95c3cd-15e5-421c-9d79-947544facc6b	TX Prop 39	Elemento decorativo TX Prop 39	TX Props-39	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
6378f57e-cebb-4294-ab86-6fe34580cc6d	TX Prop 40	Elemento decorativo TX Prop 40	TX Props-40	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
d59900dd-22ed-4bc0-b098-4f4040d20572	TX Prop 19	Elemento decorativo TX Prop 19	TX Props-19	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
e2305249-09c6-48e8-992b-b86cb487eedf	TX Prop 20	Elemento decorativo TX Prop 20	TX Props-20	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
4e7c8870-d4d4-41ee-8208-344317bd3187	TX Prop 21	Elemento decorativo TX Prop 21	TX Props-21	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
50f66130-dd3c-40ba-b216-17cb11cbe5b2	TX Prop 22	Elemento decorativo TX Prop 22	TX Props-22	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
d0c5725d-6872-48ea-bb0d-52ad49f04783	TX Prop 23	Elemento decorativo TX Prop 23	TX Props-23	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
e7537f59-fcc5-4cc1-aba1-3b9a100f3f72	TX Prop 24	Elemento decorativo TX Prop 24	TX Props-24	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
3bd4b31b-2720-438d-97db-8af2c2c63805	TX Prop 25	Elemento decorativo TX Prop 25	TX Props-25	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
dcc8236c-43ae-48f7-964b-47150f320cb3	TX Prop 26	Elemento decorativo TX Prop 26	TX Props-26	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
78f1f35f-fcad-4384-9dc5-2e1aba0472bf	TX Prop 27	Elemento decorativo TX Prop 27	TX Props-27	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
174013cf-b7df-412a-9283-512e6fc54148	TX Prop 41	Elemento decorativo TX Prop 41	TX Props-41	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
1f347edc-033d-4bc8-9ed1-a01a6b69bdd6	TX Prop 42	Elemento decorativo TX Prop 42	TX Props-42	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
807c6e43-7095-4722-a204-28ff45daebbb	TX Prop 57	Elemento decorativo TX Prop 57	TX Props-57	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
7ff89eab-ba49-43bb-af7a-8879c216ade8	TX Prop 58	Elemento decorativo TX Prop 58	TX Props-58	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
a9bbdd5d-6db5-4fd6-a050-ec9fbcd0a4ab	TX Prop 59	Elemento decorativo TX Prop 59	TX Props-59	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
3a63bdcb-a68e-4c11-9409-c6716fbfef29	TX Prop 60	Elemento decorativo TX Prop 60	TX Props-60	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
7e8b7f5c-8cee-4b95-9b5a-f94aa82e75e9	TX Prop 61	Elemento decorativo TX Prop 61	TX Props-61	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
b144fef5-15ae-4a37-b007-adca2e206916	TX Prop 62	Elemento decorativo TX Prop 62	TX Props-62	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
61b7fecf-d876-4d97-aa13-96b7182e49ed	Pared de Piedra 9	Segmento de pared de piedra para construir muros s├│lidos.	tileset_wall_9	15	Construcci├│n	{"width": 5, "height": 5}	t	{pared,muro,construccion}	2025-06-05 07:52:14.536745+00	2025-06-05 07:52:14.536745+00	t
8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	Pared de Piedra 2	Elemento de pared decorativa, ideal para dividir espacios.	tileset_wall2	15	Construcci├│n	{"width": 5, "height": 5}	t	{pared,divisi├│n,construccion}	2025-06-05 07:52:14.536745+00	2025-06-05 07:52:14.536745+00	t
e150ba03-eba6-4949-91e1-7739869a83c8	Pared de Piedra 4	Bloque de pared robusto para estructuras grandes.	tileset_wall_4	15	Construcci├│n	{"width": 5, "height": 5}	t	{pared,estructura,construccion}	2025-06-05 07:52:14.536745+00	2025-06-05 07:52:14.536745+00	t
a5feefcb-d3b7-433e-b729-5874ac12ac4e	TX Prop 43	Elemento decorativo TX Prop 43	TX Props-43	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
b1b896aa-f34f-4e50-aa64-a0e3aa719890	TX Prop 44	Elemento decorativo TX Prop 44	TX Props-44	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
7ec052d1-f923-4db6-bf14-5408c3568421	TX Prop 45	Elemento decorativo TX Prop 45	TX Props-45	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
f787e9bd-bd4f-4427-94ac-93cf28bf9892	TX Prop 46	Elemento decorativo TX Prop 46	TX Props-46	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
e534680f-4940-4398-bf64-f4ad2db5639c	TX Prop 47	Elemento decorativo TX Prop 47	TX Props-47	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
4e477e1b-2f8f-49c5-bf4c-ff2b421f0055	TX Prop 48	Elemento decorativo TX Prop 48	TX Props-48	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
39e8c5fe-9f41-450a-b92b-9a509e67911f	TX Prop 49	Elemento decorativo TX Prop 49	TX Props-49	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
6c52a254-58fc-41df-8f2f-6607825408e0	TX Prop 50	Elemento decorativo TX Prop 50	TX Props-50	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
254e3084-8360-4385-89e5-e1daac3c54dd	TX Prop 51	Elemento decorativo TX Prop 51	TX Props-51	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
132b99c0-f159-462f-baf1-8ab587a70eb6	TX Prop 52	Elemento decorativo TX Prop 52	TX Props-52	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
169b4be5-1a35-4db1-8250-98ca4272af74	TX Prop 53	Elemento decorativo TX Prop 53	TX Props-53	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
1061f177-6f9f-45d7-990d-f126fcb818c6	TX Prop 54	Elemento decorativo TX Prop 54	TX Props-54	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
3eaa2b5e-836d-4c6a-b060-ec0ba99788d5	TX Prop 55	Elemento decorativo TX Prop 55	TX Props-55	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
f8f28dec-4b60-482f-9459-472cd2c31e72	TX Prop 56	Elemento decorativo TX Prop 56	TX Props-56	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
02a39e81-8c1a-40db-bc9c-e1f6d4caa939	TX Prop 63	Elemento decorativo TX Prop 63	TX Props-63	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
57eba76f-4d04-41dd-991e-c02b2c954dc7	TX Prop 64	Elemento decorativo TX Prop 64	TX Props-64	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
2d454da6-6b30-4c4c-a3f8-c8cd239270f1	TX Prop 65	Elemento decorativo TX Prop 65	TX Props-65	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
3ed63b44-5657-41cf-8ab0-499d89cbaedc	TX Prop 66	Elemento decorativo TX Prop 66	TX Props-66	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
72573a8a-06d2-4530-a4be-5ee62ab62cd3	TX Prop 67	Elemento decorativo TX Prop 67	TX Props-67	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
6b3a66af-e341-4091-9a82-997e5ad49acf	TX Prop 68	Elemento decorativo TX Prop 68	TX Props-68	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
9eca59fa-3b80-47bf-906c-f9c3dfe8725c	TX Prop 14	Elemento decorativo TX Prop 14	TX Props-14	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
a00c14c5-cbba-4d00-9b45-576b23dcb391	TX Prop 15	Elemento decorativo TX Prop 15	TX Props-15	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
8ebfed11-e2a4-4f3d-ab8c-4b1984cf7921	TX Prop 16	Elemento decorativo TX Prop 16	TX Props-16	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
ab28c7eb-0888-428f-9107-9483c45e2c86	TX Prop 17	Elemento decorativo TX Prop 17	TX Props-17	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
41731921-446a-43b7-9230-aaea5e59d8d5	TX Prop 18	Elemento decorativo TX Prop 18	TX Props-18	15	Decoraci├│n	{"width": 1, "height": 1}	t	\N	2025-06-05 07:15:12.70694+00	2025-06-05 07:15:12.70694+00	t
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.comments (id, "postId", "userId", "contentText", "parentId", "createdAt", "updatedAt", mpath) FROM stdin;
671509a2-b06d-4bdf-8c7f-311c93f63da9	e9048a0d-85b4-4c7d-b9d5-2248ea1337f9	ac3a451c-4a06-465a-b356-b52ed661a2f6	:D	\N	2025-06-05 10:11:31.955816+00	2025-06-05 10:11:31.955816+00	671509a2-b06d-4bdf-8c7f-311c93f63da9.
9c5ee554-ae8c-41a6-9545-31fb9a34deea	a3d49419-5d9d-44b8-af4e-aa47ad6c3766	ac3a451c-4a06-465a-b356-b52ed661a2f6	Hola Ainhoa ­ƒÿÇ	\N	2025-06-05 11:45:04.177975+00	2025-06-05 11:45:04.177975+00	9c5ee554-ae8c-41a6-9545-31fb9a34deea.
\.


--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.friendships (id, "userId1", "userId2", status, "requestedByUserId", "createdAt", "updatedAt") FROM stdin;
4b500530-e673-4669-ac37-f3b1f137f8a7	ac3a451c-4a06-465a-b356-b52ed661a2f6	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	accepted	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	2025-06-04 10:45:31.521324	2025-06-04 10:45:34.37958
\.


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.likes (id, "userId", "postId", "createdAt") FROM stdin;
d3669226-0099-469d-8e3f-c8ffc3d7919c	ac3a451c-4a06-465a-b356-b52ed661a2f6	6c3ae002-f284-4fa2-9c72-46d18e272d96	2025-06-05 00:07:51.48611+00
c6e832c7-8a8e-4cd2-ba27-9a6ea45ff45f	ac3a451c-4a06-465a-b356-b52ed661a2f6	be9b557f-5a75-4597-8d93-596e13231c14	2025-06-05 00:07:53.354992+00
a4c56fc6-4ecb-4152-92b9-4b9c24b5d6c1	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	6c3ae002-f284-4fa2-9c72-46d18e272d96	2025-06-05 00:47:14.646299+00
d2e9ebb9-5402-43f8-99e6-93d7d5841274	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	be9b557f-5a75-4597-8d93-596e13231c14	2025-06-05 00:47:17.643506+00
53aabe0e-258f-47af-94d2-bb81c8a806d7	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	e9048a0d-85b4-4c7d-b9d5-2248ea1337f9	2025-06-05 06:30:33.773973+00
38a87c61-d93e-4e34-9ad9-5cd248ea4a93	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	cff20ef0-d890-4cee-9e46-0f5444f02954	2025-06-05 06:30:34.787654+00
794c8079-9a10-4467-8c4d-f0b8bf6ecae4	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	29aa65ea-3d48-489f-9e5b-bf162ab01048	2025-06-05 06:30:35.981388+00
a24bee8a-0857-4137-9ecb-49dc7a265032	ac3a451c-4a06-465a-b356-b52ed661a2f6	e9048a0d-85b4-4c7d-b9d5-2248ea1337f9	2025-06-05 10:59:35.206318+00
f0291303-0110-420f-9e17-31572e1ccd16	ac3a451c-4a06-465a-b356-b52ed661a2f6	cff20ef0-d890-4cee-9e46-0f5444f02954	2025-06-05 10:59:35.90004+00
411e4122-f9f8-4a89-8cc5-c0cfd23d6661	ac3a451c-4a06-465a-b356-b52ed661a2f6	29aa65ea-3d48-489f-9e5b-bf162ab01048	2025-06-05 10:59:37.065954+00
5a197bac-ea60-4e52-ae4d-ca4e210f87cf	ac3a451c-4a06-465a-b356-b52ed661a2f6	a3d49419-5d9d-44b8-af4e-aa47ad6c3766	2025-06-05 11:44:24.370388+00
4ac7316c-c743-4222-9a84-43588b1f6e52	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	a3d49419-5d9d-44b8-af4e-aa47ad6c3766	2025-06-05 11:45:11.086609+00
\.


--
-- Data for Name: player_characters; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.player_characters (id, x, y, "createdAt", "updatedAt", "userId", "bodyStyle", "hairStyle", "shirtStyle", "pantsStyle", "currentRoomId") FROM stdin;
89d93e36-8ea7-4530-8a8c-b08d6468adf1	350	470	2025-05-19 18:36:48.55644+00	2025-06-05 13:38:06.523831+00	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	female_white_base	hair_woman_pink	orange_shirt	pants_none	\N
3a386cf1-db51-478f-93f0-079dc55e6340	390	330	2025-05-19 18:30:00.762023+00	2025-06-05 13:38:07.103507+00	ac3a451c-4a06-465a-b356-b52ed661a2f6	male_base_black	hair_short_black	orange_shirt	white_jeans	\N
cdd908fb-8e36-404e-b19f-4a6647de2608	90	490	2025-06-03 13:05:16.114755+00	2025-06-03 13:29:58.400366+00	49884329-fe8a-4674-9f75-638e474e727b	male_base_black	hair_short_black	purple_shirt	pants_none	\N
\.


--
-- Data for Name: player_inventory_items; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.player_inventory_items (id, "userId", "catalogItemId", quantity, "acquiredAt") FROM stdin;
c1645262-3de4-481d-9b1b-16ab4f1800e1	ac3a451c-4a06-465a-b356-b52ed661a2f6	ab6a3f8d-99fb-430a-9d24-aba582b93634	995	2025-06-05 07:23:26.858382+00
e02712a0-f784-45ec-9d7c-de50f8009e96	ac3a451c-4a06-465a-b356-b52ed661a2f6	8a69cff5-da8b-4529-9092-4ffb211f8708	994	2025-06-05 07:09:05.326887+00
56a67234-1d09-4fba-b476-3c7c2d08f268	ac3a451c-4a06-465a-b356-b52ed661a2f6	6bd13610-8ac6-4b2d-9590-5fd46a5b3285	991	2025-06-05 07:09:14.496202+00
9a303208-d9bf-469e-a031-77617a4cc039	ac3a451c-4a06-465a-b356-b52ed661a2f6	61b7fecf-d876-4d97-aa13-96b7182e49ed	980	2025-06-05 07:57:53.548588+00
6ab0750d-2e2e-45df-84a8-1698b023a7af	ac3a451c-4a06-465a-b356-b52ed661a2f6	d7c7f40e-0893-48ae-a189-4acb71952ac6	100	2025-06-05 07:47:57.389133+00
014d0bb8-2bdc-4286-ae2e-9d40d71173bf	ac3a451c-4a06-465a-b356-b52ed661a2f6	5e420258-58fe-42dd-bf07-4ffed637cfe6	979	2025-06-05 06:55:40.043474+00
1d5ec773-7644-4137-a8db-67935c5a6a5e	ac3a451c-4a06-465a-b356-b52ed661a2f6	5b8ba547-2bc5-4a4a-b70f-da47a2dac72b	997	2025-06-05 07:09:09.35094+00
ce0a1808-492e-46f2-9f34-f676fc677558	ac3a451c-4a06-465a-b356-b52ed661a2f6	74c3c60b-2d19-443c-a8d0-a0922af8cef1	997	2025-06-05 07:09:18.969968+00
589e7fad-27ba-4e30-bd92-acdf65e2b6ad	ac3a451c-4a06-465a-b356-b52ed661a2f6	26e1ea91-39d5-4478-8df0-7e0277258601	938	2025-06-05 07:01:15.055217+00
1d3647ba-7e23-4308-89b4-fcedaacc83e8	ac3a451c-4a06-465a-b356-b52ed661a2f6	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	92	2025-06-05 07:53:10.251047+00
f1940fc8-d53f-47b1-a860-4fb96400d12b	ac3a451c-4a06-465a-b356-b52ed661a2f6	50214ac1-ff57-4c07-89b0-c989a14e0534	1	2025-06-05 08:21:35.665303+00
eba360d6-5abe-4aa0-80a1-5b368bc5ad8e	ac3a451c-4a06-465a-b356-b52ed661a2f6	e150ba03-eba6-4949-91e1-7739869a83c8	997	2025-06-05 07:57:49.775087+00
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.posts (id, "authorId", title, "contentText", "imageUrl", type, status, "publishedAt", "createdAt", "updatedAt", "likeCount", "commentCount") FROM stdin;
6c3ae002-f284-4fa2-9c72-46d18e272d96	ac3a451c-4a06-465a-b356-b52ed661a2f6	Lotem	Lotem es un juego multijugador	/public/uploads/chat_images/chatimg-1749082059394-605080021.png	news	published	2025-06-05 00:07:39.697+00	2025-06-05 00:07:40.549059+00	2025-06-05 00:47:14.89047+00	2	0
be9b557f-5a75-4597-8d93-596e13231c14	ac3a451c-4a06-465a-b356-b52ed661a2f6	Final TFG	Esta es una noticia de prueba para el showcase en el TFG ­ƒÿü­ƒª¥	/public/uploads/chat_images/chatimg-1749082009049-368444405.png	news	published	2025-06-05 00:06:49.583+00	2025-06-05 00:06:50.467535+00	2025-06-05 00:47:17.872882+00	2	0
e9048a0d-85b4-4c7d-b9d5-2248ea1337f9	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	\N	Los relojes giran sin mirar atr├ís, mientras las ideas vuelan como cometas en un cielo sin nubes. Cada tecla pulsa un universo, cada pensamiento es un viaje sin mapa. ┬┐Y si todo esto fuera solo el comienzo de algo que a├║n no entendemos? ­ƒîîÔîøÔ£¿	/public/uploads/chat_images/chatimg-1749105021937-288440009.png	tweet	published	2025-06-05 06:30:22.245+00	2025-06-05 06:30:24.227031+00	2025-06-05 10:59:35.436627+00	2	1
cff20ef0-d890-4cee-9e46-0f5444f02954	ac3a451c-4a06-465a-b356-b52ed661a2f6	\N	:)	\N	tweet	published	2025-06-05 02:38:32.27+00	2025-06-05 02:38:33.154166+00	2025-06-05 10:59:36.127427+00	2	0
29aa65ea-3d48-489f-9e5b-bf162ab01048	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	\N	Esto es una prueba :) ­ƒÿü	/public/uploads/chat_images/chatimg-1749090979572-89080510.png	tweet	published	2025-06-05 02:36:19.919+00	2025-06-05 02:36:20.807831+00	2025-06-05 10:59:37.278518+00	2	0
a3d49419-5d9d-44b8-af4e-aa47ad6c3766	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	\N	Hola Apollo :D	\N	tweet	published	2025-06-05 11:44:18.669+00	2025-06-05 11:44:18.749266+00	2025-06-05 11:45:11.29214+00	2	1
\.


--
-- Data for Name: private_chat_messages; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.private_chat_messages (id, "friendshipId", "senderId", "senderUsername", "receiverId", "messageText", "timestamp", "isRead", "messageType", "imageUrl") FROM stdin;
086f5fb5-7661-4563-b3f8-57347b4d0ccc	4b500530-e673-4669-ac37-f3b1f137f8a7	ac3a451c-4a06-465a-b356-b52ed661a2f6	Apollo	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	eeeeeeeeee	2025-06-04 10:45:39.391+00	t	text	\N
c83b5c63-240d-4a61-b7a9-7c9600104ed5	4b500530-e673-4669-ac37-f3b1f137f8a7	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	Ainhoa	ac3a451c-4a06-465a-b356-b52ed661a2f6	\N	2025-06-04 10:45:46.252+00	t	image	/public/uploads/chat_images/chatimg-1749033946155-757290885.gif
c413f7ad-2092-46c9-bd67-0d49c5c7ef8d	4b500530-e673-4669-ac37-f3b1f137f8a7	ac3a451c-4a06-465a-b356-b52ed661a2f6	Apollo	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	eee	2025-06-04 11:52:30.38+00	t	text	\N
478ba7d5-5a9e-44c6-b1ee-63eff9883bc5	4b500530-e673-4669-ac37-f3b1f137f8a7	ac3a451c-4a06-465a-b356-b52ed661a2f6	Apollo	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	\N	2025-06-04 12:16:34.49+00	t	image	/public/uploads/chat_images/chatimg-1749039394390-398880494.jpg
618aa7fe-ba08-44e8-bebf-4626441472ea	4b500530-e673-4669-ac37-f3b1f137f8a7	ac3a451c-4a06-465a-b356-b52ed661a2f6	Apollo	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	mira que cocina	2025-06-04 12:17:05.147+00	t	image	/public/uploads/chat_images/chatimg-1749039424754-389814405.jpg
953ea0d8-6131-4835-b163-9da2c0456403	4b500530-e673-4669-ac37-f3b1f137f8a7	ac3a451c-4a06-465a-b356-b52ed661a2f6	Apollo	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	EEE	2025-06-05 02:39:22.846+00	t	text	\N
8cb1901a-95a6-441d-bcb2-c7f0f5b7c890	4b500530-e673-4669-ac37-f3b1f137f8a7	ac3a451c-4a06-465a-b356-b52ed661a2f6	Apollo	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	HOLAAAA	2025-06-05 11:42:18.906+00	t	text	\N
\.


--
-- Data for Name: room_placed_items; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.room_placed_items (id, "roomId", "catalogItemId", "placedByUserId", x, y, rotation, "zIndex", "instanceProperties", "createdAt", "updatedAt") FROM stdin;
dd340911-87b2-4b64-bdcc-7e4dd9bb391c	07e7b10b-b7ed-482c-a61f-abd254297a41	6bd13610-8ac6-4b2d-9590-5fd46a5b3285	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	410	0	0	\N	2025-06-05 07:58:24.053781+00	2025-06-05 07:58:24.053781+00
4a4d668d-523c-4c9c-878b-90b2eb5722c0	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1050	410	0	0	\N	2025-06-05 07:58:40.314658+00	2025-06-05 07:58:40.314658+00
63fd52b7-aeb5-4efe-9ce7-5ec0c901a963	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	810	410	0	0	\N	2025-06-05 07:58:48.552928+00	2025-06-05 07:58:48.552928+00
cb1c4dd5-7ae0-4c53-b2e4-07c2b93480ec	07e7b10b-b7ed-482c-a61f-abd254297a41	5b8ba547-2bc5-4a4a-b70f-da47a2dac72b	ac3a451c-4a06-465a-b356-b52ed661a2f6	810	330	0	0	\N	2025-06-05 07:59:00.719289+00	2025-06-05 07:59:00.719289+00
db26a176-d779-4790-b4a9-265b96d4dc85	07e7b10b-b7ed-482c-a61f-abd254297a41	74c3c60b-2d19-443c-a8d0-a0922af8cef1	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	330	0	0	\N	2025-06-05 07:59:07.697141+00	2025-06-05 07:59:07.697141+00
395513a5-020a-447d-9899-8d7976f1dce5	07e7b10b-b7ed-482c-a61f-abd254297a41	8a69cff5-da8b-4529-9092-4ffb211f8708	ac3a451c-4a06-465a-b356-b52ed661a2f6	1050	330	0	0	\N	2025-06-05 07:59:14.304357+00	2025-06-05 07:59:14.304357+00
31be799f-4697-4fdb-aeed-8d86953f353f	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	250	0	0	\N	2025-06-05 07:59:28.099626+00	2025-06-05 07:59:28.099626+00
fba9c044-11b2-46a1-96df-9b2949caebf0	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	810	250	0	0	\N	2025-06-05 07:59:35.243353+00	2025-06-05 07:59:35.243353+00
6bf65c55-8dc5-4e8a-8646-a070feaa5c7d	07e7b10b-b7ed-482c-a61f-abd254297a41	6bd13610-8ac6-4b2d-9590-5fd46a5b3285	ac3a451c-4a06-465a-b356-b52ed661a2f6	1050	250	0	0	\N	2025-06-05 07:59:41.75297+00	2025-06-05 07:59:41.75297+00
981f241e-1eb7-4fd3-8dce-9e01b8bef3af	07e7b10b-b7ed-482c-a61f-abd254297a41	e411b900-df94-47e0-a40f-62b7d9f67bb5	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	170	0	0	\N	2025-06-05 08:00:50.579235+00	2025-06-05 08:00:50.579235+00
7fc744d6-eb6b-4343-95fe-d2689f3585e2	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	1110	250	0	0	\N	2025-06-05 08:01:24.902022+00	2025-06-05 08:01:24.902022+00
b5ee4f15-52fd-4dc0-9cd3-667eb43b7829	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	1110	350	0	0	\N	2025-06-05 08:01:30.944992+00	2025-06-05 08:01:30.944992+00
4ef4bae1-7ebf-4609-8464-317176737a2c	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	1110	310	0	0	\N	2025-06-05 08:01:36.518797+00	2025-06-05 08:01:36.518797+00
e8909f64-bb65-41ae-b09d-f0571c68d88f	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	1110	410	0	0	\N	2025-06-05 08:01:42.955575+00	2025-06-05 08:01:42.955575+00
d39e8235-bddc-40f1-ae8b-3e6de7769720	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.845357+00	2025-06-05 08:01:48.845357+00
7d682dc6-de31-472b-9477-40acefc6ea79	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.855467+00	2025-06-05 08:01:48.855467+00
c0765c51-2d9e-4725-906a-1c8835f27588	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.845834+00	2025-06-05 08:01:48.845834+00
c3ad7d5b-88e7-4106-83dc-069a80672ade	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.845481+00	2025-06-05 08:01:48.845481+00
25fadc57-5598-4ecd-89a1-8f24c3eb7adf	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.909996+00	2025-06-05 08:01:48.909996+00
b7c3bbdf-f11b-4324-88db-4cf83a584d00	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.91435+00	2025-06-05 08:01:48.91435+00
c6ead245-f4c2-4414-a2be-097a25cbaf56	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.917158+00	2025-06-05 08:01:48.917158+00
177066f6-b054-4782-ab09-fa56f62a59f2	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.936029+00	2025-06-05 08:01:48.936029+00
0286674e-0026-4d67-8a78-0c1edf5d39b0	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.988639+00	2025-06-05 08:01:48.988639+00
20107bf2-d4c4-4dce-b22c-ab8892d5b934	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:48.98925+00	2025-06-05 08:01:48.98925+00
67755091-9e36-4ed6-ba14-c7278f717266	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:01:49.038629+00	2025-06-05 08:01:49.038629+00
90b210ab-facb-47bd-9f31-f10afdb82571	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	790	190	0	0	\N	2025-06-05 08:06:05.038752+00	2025-06-05 08:06:05.038752+00
f42e6733-3b8a-41eb-b4f6-199309389e0c	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	850	190	0	0	\N	2025-06-05 08:06:09.785172+00	2025-06-05 08:06:09.785172+00
e5b455a0-dd19-4737-8eed-90d6cc7cbe2e	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	870	190	0	0	\N	2025-06-05 08:06:14.796931+00	2025-06-05 08:06:14.796931+00
1f20e6be-f508-46bc-bbcc-2e266ec98a57	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	990	190	0	0	\N	2025-06-05 08:06:19.647371+00	2025-06-05 08:06:19.647371+00
a9311034-57de-400f-867d-61afe9edbe65	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	1050	190	0	0	\N	2025-06-05 08:06:24.569197+00	2025-06-05 08:06:24.569197+00
0f5f0245-f374-41a4-886b-e64867cec255	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	190	0	0	\N	2025-06-05 08:06:30.960204+00	2025-06-05 08:06:30.960204+00
914c05f6-ffb4-47da-9752-d42e37aa09c3	07e7b10b-b7ed-482c-a61f-abd254297a41	ab6a3f8d-99fb-430a-9d24-aba582b93634	ac3a451c-4a06-465a-b356-b52ed661a2f6	770	210	0	0	\N	2025-06-05 08:06:48.713948+00	2025-06-05 08:06:48.713948+00
4e9e72d5-af36-4b7c-b425-c279be88f543	07e7b10b-b7ed-482c-a61f-abd254297a41	ab6a3f8d-99fb-430a-9d24-aba582b93634	ac3a451c-4a06-465a-b356-b52ed661a2f6	1090	210	0	0	\N	2025-06-05 08:06:55.322211+00	2025-06-05 08:06:55.322211+00
585416c6-7a57-4302-bf53-4cd29605e358	07e7b10b-b7ed-482c-a61f-abd254297a41	6bd13610-8ac6-4b2d-9590-5fd46a5b3285	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	270	0	0	\N	2025-06-05 08:07:05.64171+00	2025-06-05 08:07:05.64171+00
b4b6069a-ecb9-468a-850f-2ab0921ba1d6	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	350	0	0	\N	2025-06-05 08:07:13.743832+00	2025-06-05 08:07:13.743832+00
4397a601-247d-444d-b2e0-5df785521b42	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	410	0	0	\N	2025-06-05 08:07:19.578897+00	2025-06-05 08:07:19.578897+00
87273597-2b93-4b76-8982-84c36b08fef4	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	790	430	0	0	\N	2025-06-05 08:07:33.856128+00	2025-06-05 08:07:33.856128+00
c0c145dc-e30f-4db1-ac4b-5e67ff4ea3ae	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	850	430	0	0	\N	2025-06-05 08:07:39.753303+00	2025-06-05 08:07:39.753303+00
9c4998e3-7f94-4764-b6be-530d5af5d245	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	990	430	0	0	\N	2025-06-05 08:07:49.069896+00	2025-06-05 08:07:49.069896+00
d72b46d0-397e-444b-91be-8fdbe1ad1762	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	1050	430	0	0	\N	2025-06-05 08:07:54.21294+00	2025-06-05 08:07:54.21294+00
1e6513a5-ec39-46e4-ad11-eaa27179e5f3	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	1090	430	0	0	\N	2025-06-05 08:07:59.396274+00	2025-06-05 08:07:59.396274+00
6b607fa2-d753-4966-b7c2-e2d9df69bfa3	07e7b10b-b7ed-482c-a61f-abd254297a41	61b7fecf-d876-4d97-aa13-96b7182e49ed	ac3a451c-4a06-465a-b356-b52ed661a2f6	770	430	0	0	\N	2025-06-05 08:08:06.013482+00	2025-06-05 08:08:06.013482+00
9a949ac4-0f91-487b-9aff-036b4157feb8	07e7b10b-b7ed-482c-a61f-abd254297a41	41731921-446a-43b7-9230-aaea5e59d8d5	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	170	0	0	\N	2025-06-05 08:08:36.228603+00	2025-06-05 08:08:36.228603+00
19dc8ccc-7f6f-4596-9cb4-07006beb8765	07e7b10b-b7ed-482c-a61f-abd254297a41	41731921-446a-43b7-9230-aaea5e59d8d5	ac3a451c-4a06-465a-b356-b52ed661a2f6	1110	170	0	0	\N	2025-06-05 08:08:54.289235+00	2025-06-05 08:08:54.289235+00
bc9a8460-c0db-4d06-878f-ae1c0fd99486	07e7b10b-b7ed-482c-a61f-abd254297a41	41731921-446a-43b7-9230-aaea5e59d8d5	ac3a451c-4a06-465a-b356-b52ed661a2f6	1110	390	0	0	\N	2025-06-05 08:09:40.12094+00	2025-06-05 08:09:40.12094+00
b4cfc693-7bee-48f4-9c46-bd3b5f662ed5	07e7b10b-b7ed-482c-a61f-abd254297a41	41731921-446a-43b7-9230-aaea5e59d8d5	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	390	0	0	\N	2025-06-05 08:09:44.455342+00	2025-06-05 08:09:44.455342+00
8f380cfd-217f-40ab-877b-4d1a0e3580e0	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	810	490	0	0	\N	2025-06-05 08:10:33.281615+00	2025-06-05 08:10:33.281615+00
5de8cd59-4dd9-4e18-a677-b32e0159db1b	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	490	0	0	\N	2025-06-05 08:10:44.45571+00	2025-06-05 08:10:44.45571+00
3c45a52b-bd11-40ce-a8ce-fd030b2b8ede	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1050	490	0	0	\N	2025-06-05 08:10:50.58456+00	2025-06-05 08:10:50.58456+00
d05750b8-b0f0-42a3-afbb-9621aea1de5f	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	790	450	0	0	\N	2025-06-05 08:10:58.053488+00	2025-06-05 08:10:58.053488+00
94e3a1a1-6931-425d-add1-3006f4564982	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	830	450	0	0	\N	2025-06-05 08:11:04.939873+00	2025-06-05 08:11:04.939873+00
098c4dd2-a8a3-41bc-9109-6e6b18a7f8e0	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1010	450	0	0	\N	2025-06-05 08:11:11.478736+00	2025-06-05 08:11:11.478736+00
180a82c5-82e4-4d19-a33d-efe5ad64f324	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1010	450	0	0	\N	2025-06-05 08:11:11.583646+00	2025-06-05 08:11:11.583646+00
b5a4dff6-69d0-4fb5-97ea-3877a8b1ec80	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1010	450	0	0	\N	2025-06-05 08:11:11.586469+00	2025-06-05 08:11:11.586469+00
e1138a9d-9da9-4e98-bb98-aefedb4e8cbd	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1010	450	0	0	\N	2025-06-05 08:11:11.596573+00	2025-06-05 08:11:11.596573+00
425f5292-e9fb-4bd8-978f-853c15a0ca34	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1010	450	0	0	\N	2025-06-05 08:11:11.607115+00	2025-06-05 08:11:11.607115+00
e5921bb4-bfe7-4122-9a10-001ee98a4936	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1010	450	0	0	\N	2025-06-05 08:11:11.619541+00	2025-06-05 08:11:11.619541+00
1e75a2bf-d3b2-430d-9fa7-038ee1c46df0	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1010	450	0	0	\N	2025-06-05 08:11:11.627322+00	2025-06-05 08:11:11.627322+00
80bd64e9-3449-45fd-9eda-6d6998406f0f	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.559474+00	2025-06-05 08:11:17.559474+00
728a3272-2cbe-4c98-85c1-caa0db8dba35	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.563016+00	2025-06-05 08:11:17.563016+00
0d628839-9e8b-4172-8b8d-3942027a6613	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.56314+00	2025-06-05 08:11:17.56314+00
25c1de1f-4b92-49ee-a6ac-1cc33d79e198	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	550	0	0	\N	2025-06-05 08:11:37.115977+00	2025-06-05 08:11:37.115977+00
af37f91b-0c37-47f7-a3d6-d06757c5feab	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1190	250	0	0	\N	2025-06-05 08:11:49.946664+00	2025-06-05 08:11:49.946664+00
65a06c98-2c24-4c00-a027-0623e35b421c	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1190	330	0	0	\N	2025-06-05 08:12:21.160478+00	2025-06-05 08:12:21.160478+00
39296f25-94e8-4625-b39f-14bdac5fc4e1	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1190	370	0	0	\N	2025-06-05 08:12:29.882015+00	2025-06-05 08:12:29.882015+00
79b3a317-aae0-4715-9702-8858853917a2	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1190	450	0	0	\N	2025-06-05 08:12:37.832004+00	2025-06-05 08:12:37.832004+00
9224cb53-6548-4d94-8a71-1bdd2fd405d1	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1190	530	0	0	\N	2025-06-05 08:13:14.250081+00	2025-06-05 08:13:14.250081+00
de5afdfc-6e9b-4352-9b21-99fd96be9f7d	07e7b10b-b7ed-482c-a61f-abd254297a41	6bd13610-8ac6-4b2d-9590-5fd46a5b3285	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	570	0	0	\N	2025-06-05 08:13:21.784407+00	2025-06-05 08:13:21.784407+00
2ef51399-2b86-4ad6-a241-526e4efcf5ac	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1050	570	0	0	\N	2025-06-05 08:13:28.643765+00	2025-06-05 08:13:28.643765+00
6f5bd91a-1616-44fc-a932-1e80cfaf6bbe	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	650	0	0	\N	2025-06-05 08:15:18.695923+00	2025-06-05 08:15:18.695923+00
67f4874b-cfcc-4a02-8089-e5ff88c32bde	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	510	0	0	\N	2025-06-05 08:15:26.058065+00	2025-06-05 08:15:26.058065+00
ea065f44-c30c-456d-84a5-7e4f8a2416a3	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	430	0	0	\N	2025-06-05 08:15:32.050743+00	2025-06-05 08:15:32.050743+00
26d6b673-4551-4081-875a-e8ee5f009907	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	350	0	0	\N	2025-06-05 08:15:38.815596+00	2025-06-05 08:15:38.815596+00
32596006-26dd-4e25-8a9f-e9edb511e1e5	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.558634+00	2025-06-05 08:11:17.558634+00
c9d8727f-7315-448f-aef0-e00f281bbe47	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.563329+00	2025-06-05 08:11:17.563329+00
aeab1dad-f827-4e9c-86e3-8b0bf9ba9a8e	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1150	510	0	0	\N	2025-06-05 08:13:36.545199+00	2025-06-05 08:13:36.545199+00
0b8953f4-adfc-45d3-8382-cbcd8bc5ba8e	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	810	570	0	0	\N	2025-06-05 08:13:58.518179+00	2025-06-05 08:13:58.518179+00
d4f86f86-96bd-4f24-a3a9-7573eaf0ce75	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1110	590	0	0	\N	2025-06-05 08:14:06.646634+00	2025-06-05 08:14:06.646634+00
b32c123e-3633-4542-a473-3ddcf4170c5d	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	590	0	0	\N	2025-06-05 08:14:13.617434+00	2025-06-05 08:14:13.617434+00
10f8e13d-6e0e-45d0-b544-4eecb18b44f1	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	810	650	0	0	\N	2025-06-05 08:14:21.273753+00	2025-06-05 08:14:21.273753+00
571cb728-1365-44fb-b81c-d51265a4ee01	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	650	0	0	\N	2025-06-05 08:14:26.047491+00	2025-06-05 08:14:26.047491+00
6f1e429c-fcb5-4e15-99ea-d437026ec604	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1030	650	0	0	\N	2025-06-05 08:14:30.229593+00	2025-06-05 08:14:30.229593+00
b24af37f-dd92-4fb3-9cd3-29c122a4eb6d	07e7b10b-b7ed-482c-a61f-abd254297a41	8a69cff5-da8b-4529-9092-4ffb211f8708	ac3a451c-4a06-465a-b356-b52ed661a2f6	1190	330	0	0	\N	2025-06-05 08:14:43.996519+00	2025-06-05 08:14:43.996519+00
3fe7746f-6f85-4cdf-bd27-6a04c12e5c68	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1150	650	0	0	\N	2025-06-05 08:15:12.797693+00	2025-06-05 08:15:12.797693+00
d67b88c3-fa8a-454b-bef0-c8f1782b8f6b	07e7b10b-b7ed-482c-a61f-abd254297a41	8a69cff5-da8b-4529-9092-4ffb211f8708	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	330	0	0	\N	2025-06-05 08:15:45.768927+00	2025-06-05 08:15:45.768927+00
8fae3e13-f9f4-4168-a75f-b4ebd36da5c6	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	250	0	0	\N	2025-06-05 08:15:53.439004+00	2025-06-05 08:15:53.439004+00
5d3e0f15-5ea6-4d4c-845f-ba58c740328e	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.576535+00	2025-06-05 08:11:17.576535+00
284ccb98-0a86-4923-85da-a5b8049a6809	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.580962+00	2025-06-05 08:11:17.580962+00
bfd6af8f-5bbb-41bb-a4a6-db45ed864586	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.595476+00	2025-06-05 08:11:17.595476+00
a34aa9fd-305f-42da-9459-e1edba6bb9bb	07e7b10b-b7ed-482c-a61f-abd254297a41	e150ba03-eba6-4949-91e1-7739869a83c8	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	450	0	0	\N	2025-06-05 08:11:17.611405+00	2025-06-05 08:11:17.611405+00
616ff07d-320e-4a95-94df-9b162c6b375c	07e7b10b-b7ed-482c-a61f-abd254297a41	d1dd77a4-8d40-4672-99cd-ea0bbb1b0a7c	ac3a451c-4a06-465a-b356-b52ed661a2f6	1030	310	0	0	\N	2025-06-05 08:16:15.009293+00	2025-06-05 08:16:15.009293+00
c0b4bec8-a44d-4a00-a9ef-e56a953a3ff3	07e7b10b-b7ed-482c-a61f-abd254297a41	6bd13610-8ac6-4b2d-9590-5fd46a5b3285	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	510	0	0	\N	2025-06-05 08:16:31.19952+00	2025-06-05 08:16:31.19952+00
e39a7ad5-83ba-4c5c-9696-3158aef6bfa2	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	690	650	0	0	\N	2025-06-05 08:16:40.422189+00	2025-06-05 08:16:40.422189+00
49c07839-1099-45a4-b0f9-60fd0870561d	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	570	650	0	0	\N	2025-06-05 08:16:45.176977+00	2025-06-05 08:16:45.176977+00
6b3e4295-f35e-4cfa-9dcc-f7a2bda665c0	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	570	570	0	0	\N	2025-06-05 08:16:49.715728+00	2025-06-05 08:16:49.715728+00
bb4bb946-62c0-4a33-be96-c6c444a6701d	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	570	490	0	0	\N	2025-06-05 08:16:55.409502+00	2025-06-05 08:16:55.409502+00
8f07a12e-ee94-4847-b43b-39bb1b4302c8	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	570	410	0	0	\N	2025-06-05 08:16:59.404616+00	2025-06-05 08:16:59.404616+00
232baf85-6827-4d7e-9b67-fc4687b81c76	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	570	330	0	0	\N	2025-06-05 08:17:03.625874+00	2025-06-05 08:17:03.625874+00
8742bba9-fd60-4614-a96f-ce418b5c54d4	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	570	250	0	0	\N	2025-06-05 08:17:07.789667+00	2025-06-05 08:17:07.789667+00
9b70fc6c-d1c6-4643-b2b7-1a6d2097c786	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	670	250	0	0	\N	2025-06-05 08:17:12.465954+00	2025-06-05 08:17:12.465954+00
7b49ff39-0ad9-4f76-a735-927d2b312cba	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	670	330	0	0	\N	2025-06-05 08:17:17.294727+00	2025-06-05 08:17:17.294727+00
b186e63c-cdc4-4db3-bdb0-2edacfa3ed78	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	670	410	0	0	\N	2025-06-05 08:17:20.855454+00	2025-06-05 08:17:20.855454+00
c21b9b2d-4a7d-4967-bed2-fbb82f2c4026	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	670	490	0	0	\N	2025-06-05 08:17:25.217311+00	2025-06-05 08:17:25.217311+00
580c854f-4514-4458-9ee7-1cac7d271344	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	670	570	0	0	\N	2025-06-05 08:17:29.253117+00	2025-06-05 08:17:29.253117+00
ea5fa3da-3341-4ba4-abdf-1fb274d8c9e2	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	570	0	0	\N	2025-06-05 08:17:38.62137+00	2025-06-05 08:17:38.62137+00
78150748-fa77-4cf4-84da-b3b0ab16ad27	07e7b10b-b7ed-482c-a61f-abd254297a41	5e420258-58fe-42dd-bf07-4ffed637cfe6	ac3a451c-4a06-465a-b356-b52ed661a2f6	730	510	0	0	\N	2025-06-05 08:17:45.078441+00	2025-06-05 08:17:45.078441+00
a7dfee9b-ddc7-43ab-9c75-cbf21786b27e	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1330	250	0	0	\N	2025-06-05 08:17:57.001171+00	2025-06-05 08:17:57.001171+00
4a60a022-8d62-4096-b41c-5fd2a06ef588	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1330	330	0	0	\N	2025-06-05 08:18:04.303254+00	2025-06-05 08:18:04.303254+00
b3ac5056-6855-4e74-a4a1-fe1b544a5506	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1330	410	0	0	\N	2025-06-05 08:18:08.353392+00	2025-06-05 08:18:08.353392+00
a29f5eeb-aeaa-4471-a2ab-4c984b393e7c	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1330	490	0	0	\N	2025-06-05 08:18:11.81309+00	2025-06-05 08:18:11.81309+00
e14faba5-ad9e-4966-9a45-f964eaac99de	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1330	570	0	0	\N	2025-06-05 08:18:15.397476+00	2025-06-05 08:18:15.397476+00
cf909ce2-4aff-4ad1-a067-6f5a22cd6996	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1330	650	0	0	\N	2025-06-05 08:18:23.187844+00	2025-06-05 08:18:23.187844+00
4d2d3925-c8a4-4fc4-8e6e-fc570e13f2df	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	550	0	0	\N	2025-06-05 08:18:28.719992+00	2025-06-05 08:18:28.719992+00
d043ca9f-2dd0-42d0-8517-c795388a8419	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	1210	450	0	0	\N	2025-06-05 08:18:32.373136+00	2025-06-05 08:18:32.373136+00
12d67b93-d49a-40f9-a21d-48c84beb1787	07e7b10b-b7ed-482c-a61f-abd254297a41	26e1ea91-39d5-4478-8df0-7e0277258601	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	550	0	0	\N	2025-06-05 08:18:37.773382+00	2025-06-05 08:18:37.773382+00
f7f08f16-d6d3-4d93-9f9e-8e87bace4ed8	07e7b10b-b7ed-482c-a61f-abd254297a41	8e25f525-6b2b-4df4-ad1f-8ce05f2b684c	ac3a451c-4a06-465a-b356-b52ed661a2f6	750	250	0	0	\N	2025-06-05 08:19:00.413155+00	2025-06-05 08:19:00.413155+00
a7d617b5-382d-458f-9d4a-666c3d9f2c21	07e7b10b-b7ed-482c-a61f-abd254297a41	d0c5725d-6872-48ea-bb0d-52ad49f04783	ac3a451c-4a06-465a-b356-b52ed661a2f6	790	290	0	0	\N	2025-06-05 08:19:49.381377+00	2025-06-05 08:19:49.381377+00
bf5e6ea9-4267-4a30-a74b-9374693b0f51	07e7b10b-b7ed-482c-a61f-abd254297a41	39e8c5fe-9f41-450a-b92b-9a509e67911f	ac3a451c-4a06-465a-b356-b52ed661a2f6	930	330	0	0	\N	2025-06-05 08:20:35.871745+00	2025-06-05 08:20:35.871745+00
5cc6af98-1d59-46ad-9769-13cc7c7ddb1e	07e7b10b-b7ed-482c-a61f-abd254297a41	95117ecb-903e-48fa-9607-6d634995c5b5	ac3a451c-4a06-465a-b356-b52ed661a2f6	1070	510	0	0	\N	2025-06-05 08:20:46.880942+00	2025-06-05 08:20:46.880942+00
7721d7c2-d4e9-48bc-958e-8bac789b0f90	07e7b10b-b7ed-482c-a61f-abd254297a41	807c6e43-7095-4722-a204-28ff45daebbb	ac3a451c-4a06-465a-b356-b52ed661a2f6	610	270	0	0	\N	2025-06-05 08:21:07.529439+00	2025-06-05 08:21:07.529439+00
a2a6a518-1e94-4410-9791-d636efd5630e	07e7b10b-b7ed-482c-a61f-abd254297a41	b144fef5-15ae-4a37-b007-adca2e206916	ac3a451c-4a06-465a-b356-b52ed661a2f6	1170	550	0	0	\N	2025-06-05 08:21:22.484075+00	2025-06-05 08:21:22.484075+00
cddb2fea-401d-46b7-a05e-008c0054e54b	07e7b10b-b7ed-482c-a61f-abd254297a41	a5feefcb-d3b7-433e-b729-5874ac12ac4e	ac3a451c-4a06-465a-b356-b52ed661a2f6	850	510	0	0	\N	2025-06-05 08:22:44.959527+00	2025-06-05 08:22:44.959527+00
e72ba3a4-0e47-4672-96dc-5871ea64dbb8	07e7b10b-b7ed-482c-a61f-abd254297a41	ab6a3f8d-99fb-430a-9d24-aba582b93634	ac3a451c-4a06-465a-b356-b52ed661a2f6	530	650	0	0	\N	2025-06-05 09:05:19.265661+00	2025-06-05 09:05:19.265661+00
0142194f-bbd6-41fd-bd0c-e458335166c0	887d1893-350c-4d51-9968-3ab9598da74e	369615bc-287e-449e-b12a-d5eeb3a42c67	ac3a451c-4a06-465a-b356-b52ed661a2f6	870	470	0	0	\N	2025-06-05 10:02:07.281413+00	2025-06-05 10:02:07.281413+00
f46c0dcb-f752-47d1-ab53-3468e9d5f1a4	07e7b10b-b7ed-482c-a61f-abd254297a41	369615bc-287e-449e-b12a-d5eeb3a42c67	ac3a451c-4a06-465a-b356-b52ed661a2f6	570	390	0	0	\N	2025-06-05 11:40:30.899738+00	2025-06-05 11:40:30.899738+00
e8d2c9fd-7a10-467d-aab2-dd40159a8b72	07e7b10b-b7ed-482c-a61f-abd254297a41	22fcde0b-e0ab-4d21-a590-38e64d5feca0	ac3a451c-4a06-465a-b356-b52ed661a2f6	650	570	0	0	\N	2025-06-05 13:18:32.810635+00	2025-06-05 13:18:32.810635+00
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.rooms (id, name, "hostUserId", status, "maxPlayers", "createdAt", "updatedAt") FROM stdin;
887d1893-350c-4d51-9968-3ab9598da74e	test	ac3a451c-4a06-465a-b356-b52ed661a2f6	closed	4	2025-06-05 06:41:35.926958+00	2025-06-05 10:03:53.335187+00
6a73f156-b4a4-482c-bdb2-86c65f9a7159	Holaa	ac3a451c-4a06-465a-b356-b52ed661a2f6	closed	4	2025-06-05 10:04:00.7409+00	2025-06-05 11:39:17.57317+00
60596197-dd9f-4ac4-ac04-ccace13a1f8a	Test	b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	closed	4	2025-06-05 02:36:40.239596+00	2025-06-05 13:17:50.451638+00
07e7b10b-b7ed-482c-a61f-abd254297a41	Cesur	ac3a451c-4a06-465a-b356-b52ed661a2f6	closed	4	2025-06-05 02:33:01.324079+00	2025-06-05 13:38:07.42088+00
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.user_achievements (id, "userId", "achievementId", progress, "isUnlocked", "unlockedAt", "isRewardClaimed", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: lotem_owner
--

COPY public.users (id, username, email, password, "isVerified", "verificationToken", "passwordResetToken", "passwordResetExpires", "createdAt", "updatedAt", "currencyBalance", role) FROM stdin;
49884329-fe8a-4674-9f75-638e474e727b	Lotem	lotem@lotem.es	$2b$10$n7n/ZhqxmbALZeg3FKXX0.HVdlJm9jbDUaiK5vtVx0BMXC5ug2R.i	f	\N	\N	\N	2025-06-03 13:05:08.380119+00	2025-06-03 13:19:34.198829+00	0	user
ac3a451c-4a06-465a-b356-b52ed661a2f6	Apollo	apollodbl@gmail.com	$2b$10$yxY5B5TEGODZOrsgVPrWSuN6DgnnGn7do3NMjWKibBxlMWGOp0pdO	f	\N	\N	\N	2025-05-19 18:29:57.096324+00	2025-06-05 11:40:24.36697+00	91491	editor
b81ac6df-1909-4e7b-a3d2-9a8d1a2777f2	Ainhoa	test@test.es	$2b$10$Nj5xAAsYQGuY/YcF0j0eAuFHavu0ukHC0uoHugIE6T8d8FBroyoNG	f	\N	\N	\N	2025-05-19 18:36:41.492474+00	2025-06-05 01:26:08.845341+00	0	user
\.


--
-- Name: rooms PK_0368a2d7c215f2d0458a54933f2; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY (id);


--
-- Name: friendships PK_08af97d0be72942681757f07bc8; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT "PK_08af97d0be72942681757f07bc8" PRIMARY KEY (id);


--
-- Name: achievements PK_1bc19c37c6249f70186f318d71d; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY (id);


--
-- Name: posts PK_2829ac61eff60fcec60d7274b9e; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY (id);


--
-- Name: private_chat_messages PK_314daab1f4832b250bd2870b857; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.private_chat_messages
    ADD CONSTRAINT "PK_314daab1f4832b250bd2870b857" PRIMARY KEY (id);


--
-- Name: user_achievements PK_3d94aba7e9ed55365f68b5e77fa; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "PK_3d94aba7e9ed55365f68b5e77fa" PRIMARY KEY (id);


--
-- Name: player_characters PK_4faad69f48d86dfa28b6390cccf; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT "PK_4faad69f48d86dfa28b6390cccf" PRIMARY KEY (id);


--
-- Name: player_inventory_items PK_8236ed11e8a9ee084ebe39e8004; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.player_inventory_items
    ADD CONSTRAINT "PK_8236ed11e8a9ee084ebe39e8004" PRIMARY KEY (id);


--
-- Name: comments PK_8bf68bc960f2b69e818bdb90dcb; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: likes PK_a9323de3f8bced7539a794b4a37; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT "PK_a9323de3f8bced7539a794b4a37" PRIMARY KEY (id);


--
-- Name: catalog_items PK_dd1c29828c10a599d894b9b6535; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.catalog_items
    ADD CONSTRAINT "PK_dd1c29828c10a599d894b9b6535" PRIMARY KEY (id);


--
-- Name: room_placed_items PK_f8635a19733867f6bb30e963a73; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.room_placed_items
    ADD CONSTRAINT "PK_f8635a19733867f6bb30e963a73" PRIMARY KEY (id);


--
-- Name: player_characters REL_51cc56f385d289bf0507d1eca0; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT "REL_51cc56f385d289bf0507d1eca0" UNIQUE ("userId");


--
-- Name: catalog_items UQ_479ad8961d62617aa8a81460844; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.catalog_items
    ADD CONSTRAINT "UQ_479ad8961d62617aa8a81460844" UNIQUE (name);


--
-- Name: likes UQ_74b9b8cd79a1014e50135f266fe; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT "UQ_74b9b8cd79a1014e50135f266fe" UNIQUE ("userId", "postId");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);


--
-- Name: IDX_0dd1e9b01c19ba7704b845930d; Type: INDEX; Schema: public; Owner: lotem_owner
--

CREATE UNIQUE INDEX "IDX_0dd1e9b01c19ba7704b845930d" ON public.friendships USING btree ("userId1", "userId2");


--
-- Name: IDX_1b7d3f5b86b7231a02e5fe4a83; Type: INDEX; Schema: public; Owner: lotem_owner
--

CREATE INDEX "IDX_1b7d3f5b86b7231a02e5fe4a83" ON public.private_chat_messages USING btree ("friendshipId", "timestamp");


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: lotem_owner
--

CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- Name: IDX_c1acd69cf91b1e353634c152dd; Type: INDEX; Schema: public; Owner: lotem_owner
--

CREATE UNIQUE INDEX "IDX_c1acd69cf91b1e353634c152dd" ON public.user_achievements USING btree ("userId", "achievementId");


--
-- Name: IDX_fe0bb3f6520ee0469504521e71; Type: INDEX; Schema: public; Owner: lotem_owner
--

CREATE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON public.users USING btree (username);


--
-- Name: room_placed_items FK_014359bb3596f3b83f3ac852505; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.room_placed_items
    ADD CONSTRAINT "FK_014359bb3596f3b83f3ac852505" FOREIGN KEY ("placedByUserId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: private_chat_messages FK_04618d8b3551aa09ecceead87d4; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.private_chat_messages
    ADD CONSTRAINT "FK_04618d8b3551aa09ecceead87d4" FOREIGN KEY ("friendshipId") REFERENCES public.friendships(id) ON DELETE CASCADE;


--
-- Name: room_placed_items FK_1b18f745419d02d78afc3bfbfd1; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.room_placed_items
    ADD CONSTRAINT "FK_1b18f745419d02d78afc3bfbfd1" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: player_inventory_items FK_2edab41dff7517f0722912cffab; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.player_inventory_items
    ADD CONSTRAINT "FK_2edab41dff7517f0722912cffab" FOREIGN KEY ("catalogItemId") REFERENCES public.catalog_items(id);


--
-- Name: user_achievements FK_3ac6bc9da3e8a56f3f7082012dd; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "FK_3ac6bc9da3e8a56f3f7082012dd" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: private_chat_messages FK_4e957ccfd1cec83772070ac83af; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.private_chat_messages
    ADD CONSTRAINT "FK_4e957ccfd1cec83772070ac83af" FOREIGN KEY ("receiverId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rooms FK_4ff75d7865d01ca6eab1c2cb889; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT "FK_4ff75d7865d01ca6eab1c2cb889" FOREIGN KEY ("hostUserId") REFERENCES public.users(id);


--
-- Name: player_characters FK_51cc56f385d289bf0507d1eca06; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT "FK_51cc56f385d289bf0507d1eca06" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_characters FK_677af92f49df6d0cd005590c161; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT "FK_677af92f49df6d0cd005590c161" FOREIGN KEY ("currentRoomId") REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: user_achievements FK_6a5a5816f54d0044ba5f3dc2b74; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "FK_6a5a5816f54d0044ba5f3dc2b74" FOREIGN KEY ("achievementId") REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: comments FK_7e8d7c49f218ebb14314fdb3749; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "FK_7e8d7c49f218ebb14314fdb3749" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships FK_80679cd67f895d8bd89ca330b8a; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT "FK_80679cd67f895d8bd89ca330b8a" FOREIGN KEY ("userId1") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments FK_8770bd9030a3d13c5f79a7d2e81; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "FK_8770bd9030a3d13c5f79a7d2e81" FOREIGN KEY ("parentId") REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: friendships FK_91b8301b807e6ae36001c2b6e5c; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT "FK_91b8301b807e6ae36001c2b6e5c" FOREIGN KEY ("requestedByUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: achievements FK_adb215196ce2a092afc675835dc; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT "FK_adb215196ce2a092afc675835dc" FOREIGN KEY ("rewardItemId") REFERENCES public.catalog_items(id);


--
-- Name: private_chat_messages FK_c496c4071d8a3df917457b6bee9; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.private_chat_messages
    ADD CONSTRAINT "FK_c496c4071d8a3df917457b6bee9" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: room_placed_items FK_c5829208db50f75301713fd16cb; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.room_placed_items
    ADD CONSTRAINT "FK_c5829208db50f75301713fd16cb" FOREIGN KEY ("catalogItemId") REFERENCES public.catalog_items(id);


--
-- Name: posts FK_c5a322ad12a7bf95460c958e80e; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT "FK_c5a322ad12a7bf95460c958e80e" FOREIGN KEY ("authorId") REFERENCES public.users(id);


--
-- Name: player_inventory_items FK_ce5253a1fa40fed68db0d5ad86b; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.player_inventory_items
    ADD CONSTRAINT "FK_ce5253a1fa40fed68db0d5ad86b" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes FK_cfd8e81fac09d7339a32e57d904; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT "FK_cfd8e81fac09d7339a32e57d904" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes FK_e2fe567ad8d305fefc918d44f50; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT "FK_e2fe567ad8d305fefc918d44f50" FOREIGN KEY ("postId") REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments FK_e44ddaaa6d058cb4092f83ad61f; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "FK_e44ddaaa6d058cb4092f83ad61f" FOREIGN KEY ("postId") REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: friendships FK_ef503689e22bd3849f290b8e357; Type: FK CONSTRAINT; Schema: public; Owner: lotem_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT "FK_ef503689e22bd3849f290b8e357" FOREIGN KEY ("userId2") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

