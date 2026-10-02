-- CUSTOMERS
insert into public.customers (id,name,contact_person,designation,mobile,email,website,address,city,country,trn,industry,salesperson,customer_type,notes) values
('c0000000-0000-0000-0000-000000000001','Meridian Telecom LLC','Faisal Haddad','IT Manager','+971 50 442 8817','faisal@meridiantel.ae','meridiantel.ae','Office 1204, Bay Square','Dubai','UAE','100412887600003','Telecom','Rania Al-Farsi','Key Account','Network refresh programme running over 3 phases.'),
('c0000000-0000-0000-0000-000000000002','Al Noor Hospitality Group','Sara Mansour','Head of Technology','+971 55 209 3344','sara.m@alnoorhg.com','alnoorhg.com','Sheikh Zayed Road, Tower 2','Dubai','UAE','100288471200003','Hospitality','Omar Siddiqui','Existing','12 properties, standardising on Aruba WiFi.'),
('c0000000-0000-0000-0000-000000000003','Gulf Marine Engineering','Deepak Nair','Procurement Lead','+971 52 771 9002','deepak@gulfmarine.ae','gulfmarine.ae','Plot 44, Mussafah M-9','Abu Dhabi','UAE','100773119800003','Marine','Rania Al-Farsi','Prospect','Price sensitive, always asks for 3 options.'),
('c0000000-0000-0000-0000-000000000004','Horizon Financial Services','Layla Kassem','CIO','+971 56 118 7745','layla.k@horizonfs.ae','horizonfs.ae','DIFC Gate Village 4','Dubai','UAE','100991223400003','Finance','Omar Siddiqui','Key Account','Security-first, FortiGate estate.');

-- SUPPLIERS
insert into public.suppliers (id,name,contact_person,mobile,email,country,city,brands,payment_terms,delivery_terms,currency,reliability_notes) values
('50000000-0000-0000-0000-000000000001','Nexline IT Distribution','Anand Kumar','+971 4 332 1180','sales@nexlinedist.ae','UAE','Dubai','Cisco, Aruba, APC','Net 30','Ex-works Dubai','AED','Consistent, strong Cisco allocation.'),
('50000000-0000-0000-0000-000000000002','Orbit Systems FZE','Michael Roche','+971 4 887 2210','quotes@orbitsystems.ae','UAE','Sharjah','Cisco, Fortinet, Dell','Net 45','Delivered Dubai','AED','Fast delivery, slightly higher pricing.'),
('50000000-0000-0000-0000-000000000003','GulfNet Supply Co','Hassan Tarek','+971 6 552 7781','hassan@gulfnetsupply.com','UAE','Sharjah','Aruba, Ubiquiti, Fortinet','Prepay','Ex-works Sharjah','AED','Cheapest but long lead times.'),
('50000000-0000-0000-0000-000000000004','Levant Tech Trading','Rami Aoun','+961 1 447 210','rami@levanttech.com','Lebanon','Beirut','Fortinet, Sophos','Net 30','Air freight','USD','Good on firewalls, watch freight cost.'),
('50000000-0000-0000-0000-000000000005','Sigma Networks DMCC','Priya Menon','+971 4 559 8821','priya@sigmanet.ae','UAE','Dubai','Cisco, Juniper, Aruba','Net 30','Delivered site','AED','Reliable on transceivers and optics.');

-- LEADS
insert into public.leads (id,customer_id,lead_no,lead_date,company_name,contact_person,mobile,email,source,salesperson,requirement,expected_value,probability,next_followup,status,notes) values
('1e000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','LEAD-2026-0148',current_date - 6,'Meridian Telecom LLC','Faisal Haddad','+971 50 442 8817','faisal@meridiantel.ae','Existing Customer','Rania Al-Farsi','Phase 2 core switching refresh',480000,70,current_date,'RFQ Received','RFQ already with purchase team.'),
('1e000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','LEAD-2026-0149',current_date - 5,'Al Noor Hospitality Group','Sara Mansour','+971 55 209 3344','sara.m@alnoorhg.com','Referral','Omar Siddiqui','WiFi upgrade across 4 hotels',265000,60,current_date,'Quotation','Quotation sent, waiting on board sign-off.'),
('1e000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003','LEAD-2026-0150',current_date - 3,'Gulf Marine Engineering','Deepak Nair','+971 52 771 9002','Email','Website','Rania Al-Farsi','Firewall replacement for 2 sites',96000,40,current_date + 2,'Qualified','Asked for 3 brand options.'),
('1e000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000004','LEAD-2026-0151',current_date - 2,'Horizon Financial Services','Layla Kassem','+971 56 118 7745','layla.k@horizonfs.ae','Phone','Omar Siddiqui','FortiGate HA pair plus licences',188000,55,current_date,'Contacted','Budget confirmed for Q4.'),
('1e000000-0000-0000-0000-000000000005',null,'LEAD-2026-0152',current_date - 1,'Crescent Logistics','Tariq Bin Zayed','+971 50 887 1120','tariq@crescentlog.ae','WhatsApp','Rania Al-Farsi','Warehouse WiFi and CCTV cabling',72000,30,current_date + 4,'New','Inbound WhatsApp enquiry.'),
('1e000000-0000-0000-0000-000000000006',null,'LEAD-2026-0153',current_date,'Emirates Medical Centre','Dr. Nadia Rashid','+971 55 663 2210','nadia@emcdubai.ae','Marketing','Omar Siddiqui','Clinic network and server room',134000,35,current_date + 3,'New','From LinkedIn campaign.');

-- RFQs
insert into public.rfqs (id,rfq_no,customer_id,salesperson,rfq_date,required_date,customer_reference,project_name,priority,status,notes,shipping_cost,other_cost,target_gp_percent,submitted_at,submitted_by,ready_at,ready_by) values
('a0000000-0000-0000-0000-000000000001','RFQ-2026-0125','c0000000-0000-0000-0000-000000000001','Rania Al-Farsi',current_date - 4,current_date + 8,'MT-PO-REF-9912','Network Refresh Phase 2','High','SUPPLIER PRICES RECEIVED','Customer needs delivery before fiscal close.',4200,1500,20,now() - interval '3 days','Rania Al-Farsi',null,null),
('a0000000-0000-0000-0000-000000000002','RFQ-2026-0126','c0000000-0000-0000-0000-000000000002','Omar Siddiqui',current_date - 6,current_date + 3,'ANH-2291','Hotel WiFi Upgrade — 4 Properties','Normal','READY FOR CRM','Purchase locked Nexline pricing.',2600,900,18,now() - interval '5 days','Omar Siddiqui',now() - interval '1 day','Karim Dabbagh'),
('a0000000-0000-0000-0000-000000000003','RFQ-2026-0127','c0000000-0000-0000-0000-000000000003','Rania Al-Farsi',current_date - 1,current_date + 12,'GME-RFQ-8841','Firewall Replacement — 2 Sites','Normal','SUBMITTED TO PURCHASE','Customer asked for 3 brand options.',1800,400,22,now() - interval '20 hours','Rania Al-Farsi',null,null),
('a0000000-0000-0000-0000-000000000004','RFQ-2026-0128','c0000000-0000-0000-0000-000000000004','Omar Siddiqui',current_date,current_date + 15,'HFS-IT-0042','FortiGate HA Pair + Licences','Urgent','DRAFT','Still confirming licence duration with customer.',0,0,20,null,null,null,null),
('a0000000-0000-0000-0000-000000000005','RFQ-2026-0121','c0000000-0000-0000-0000-000000000001','Rania Al-Farsi',current_date - 24,current_date - 6,'MT-PO-REF-9880','Network Refresh Phase 1','High','WON','Delivered and invoiced.',3800,1200,20,now() - interval '23 days','Rania Al-Farsi',now() - interval '20 days','Karim Dabbagh');

-- RFQ ITEMS
insert into public.rfq_items (id,rfq_id,category,brand,model,part_number,description,quantity,target_price,selling_price) values
('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Switching','Cisco','Catalyst 9300','C9300-48T-E','Catalyst 9300 48-port switch, Network Essentials',6,31000,36400),
('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','Security','Fortinet','FortiGate 100F','FG-100F','FortiGate 100F firewall appliance',4,22000,26800),
('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','Wireless','Aruba','AP-555','JZ356A','Aruba 555 Wi-Fi 6 access point',24,5200,6200),
('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','Optics','Cisco','SFP+','SFP-10G-SR','10G SFP+ SR transceiver',48,740,900),
('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','Wireless','Aruba','AP-515','R0G72A','Aruba 515 Wi-Fi 6 access point',64,2900,3550),
('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002','Switching','Aruba','2930F 48G','JL262A','Aruba 2930F 48-port PoE+ switch',8,9800,11900),
('b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003','Security','Fortinet','FortiGate 60F','FG-60F','FortiGate 60F with 1 yr UTP bundle',2,6400,0),
('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000003','Security','Sophos','XGS 2100','XGS2100','Sophos XGS 2100 firewall, 1 yr protect',2,7100,0),
('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000004','Security','Fortinet','FortiGate 200F','FG-200F','FortiGate 200F HA pair',2,54000,0),
('b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000005','Switching','Cisco','Catalyst 9200L','C9200L-24P-4G','Catalyst 9200L 24-port PoE+ switch',10,13400,16200);

-- SUPPLIER QUOTES
insert into public.supplier_quotes (id,rfq_item_id,supplier_id,unit_cost,availability,delivery_days,warranty,payment_terms,quote_ref,notes) values
('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',28400,'In stock',5,'3 yr','Net 30','NX-Q-88421',''),
('d0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',29900,'In stock',3,'5 yr','Net 45','OS-4471','Faster but pricier.'),
('d0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003',27100,'2 weeks',14,'1 yr','Prepay','GN-2210','Long lead time.'),
('d0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002',19800,'In stock',4,'1 yr','Net 45','OS-4472',''),
('d0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000004',19200,'In stock',9,'1 yr','Net 30','LT-7712','Freight adds ~AED 900.'),
('d0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',4650,'In stock',6,'3 yr','Net 30','NX-Q-88422',''),
('d0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000003',4480,'Partial stock',12,'1 yr','Prepay','GN-2211','Only 14 units available now.'),
('d0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000005',612,'In stock',3,'Lifetime','Net 30','SG-9901',''),
('d0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001',668,'In stock',5,'3 yr','Net 30','NX-Q-88423',''),
('d0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000001',2410,'In stock',4,'3 yr','Net 30','NX-Q-88390',''),
('d0000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000003',2360,'3 weeks',21,'1 yr','Prepay','GN-2190','Too slow for this project.'),
('d0000000-0000-0000-0000-00000000000c','b0000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001',8450,'In stock',4,'Lifetime','Net 30','NX-Q-88391',''),
('d0000000-0000-0000-0000-00000000000d','b0000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000005',8720,'In stock',6,'Lifetime','Net 30','SG-9880',''),
('d0000000-0000-0000-0000-00000000000e','b0000000-0000-0000-0000-00000000000a','50000000-0000-0000-0000-000000000001',12100,'In stock',5,'3 yr','Net 30','NX-Q-87110','');

-- SELECTED SUPPLIERS
update public.rfq_items set selected_quote_id = 'd0000000-0000-0000-0000-00000000000a' where id = 'b0000000-0000-0000-0000-000000000005';
update public.rfq_items set selected_quote_id = 'd0000000-0000-0000-0000-00000000000c' where id = 'b0000000-0000-0000-0000-000000000006';
update public.rfq_items set selected_quote_id = 'd0000000-0000-0000-0000-000000000001' where id = 'b0000000-0000-0000-0000-000000000001';
update public.rfq_items set selected_quote_id = 'd0000000-0000-0000-0000-00000000000e' where id = 'b0000000-0000-0000-0000-00000000000a';

-- QUOTATIONS
insert into public.quotations (id,quotation_no,rfq_id,customer_id,salesperson,quote_date,valid_until,status,approval_status,approved_by,approved_at,sent_at,notes) values
('90000000-0000-0000-0000-000000000001','QTN-2026-0096','a0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','Omar Siddiqui',current_date - 1,current_date + 20,'Sent','Approved','Karim Dabbagh',now() - interval '18 hours',now() - interval '16 hours','Board sign-off expected this week.'),
('90000000-0000-0000-0000-000000000002','QTN-2026-0090','a0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000001','Rania Al-Farsi',current_date - 20,current_date - 1,'Won','Auto-approved',null,null,now() - interval '19 days','Phase 1 awarded.');

insert into public.quotation_items (quotation_id,description,part_number,quantity,unit_cost,unit_price) values
('90000000-0000-0000-0000-000000000001','Aruba 515 Wi-Fi 6 access point','R0G72A',64,2410,3550),
('90000000-0000-0000-0000-000000000001','Aruba 2930F 48-port PoE+ switch','JL262A',8,8450,11900),
('90000000-0000-0000-0000-000000000002','Catalyst 9200L 24-port PoE+ switch','C9200L-24P-4G',10,12100,16200);

-- FOLLOW UPS
insert into public.follow_ups (customer_id,quotation_id,rfq_id,due_date,due_time,type,owner,notes,next_action,done) values
('c0000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001',null,current_date,'10:30','Call','Omar Siddiqui','Check board sign-off status','Confirm PO timeline',false),
('c0000000-0000-0000-0000-000000000001',null,'a0000000-0000-0000-0000-000000000001',current_date,'14:00','WhatsApp','Rania Al-Farsi','Update customer on switch lead time','Share revised delivery date',false),
('c0000000-0000-0000-0000-000000000004',null,'a0000000-0000-0000-0000-000000000004',current_date - 2,'11:00','Meeting','Omar Siddiqui','Confirm licence duration','Finalise RFQ items',false),
('c0000000-0000-0000-0000-000000000003',null,'a0000000-0000-0000-0000-000000000003',current_date + 2,'09:30','Email','Rania Al-Farsi','Send 3 firewall options','Await shortlist',false);

-- NOTIFICATIONS
insert into public.notifications (title,message,target_role,rfq_id,quotation_id,sender,kind,read_at,created_at) values
('New RFQ received','RFQ-2026-0127 · Gulf Marine Engineering · 2 items · required in 12 days · Priority Normal','purchase','a0000000-0000-0000-0000-000000000003',null,'Rania Al-Farsi','alert',null,now() - interval '20 hours'),
('RFQ ready for quotation','RFQ-2026-0126 · Al Noor Hospitality Group · purchase cost AED 221,840 · suggested selling AED 322,400 · GP 21.4%','crm','a0000000-0000-0000-0000-000000000002',null,'Karim Dabbagh','success',null,now() - interval '1 day'),
('Supplier prices received','RFQ-2026-0125 · 14 supplier prices captured across 4 items','crm','a0000000-0000-0000-0000-000000000001',null,'Karim Dabbagh','info',null,now() - interval '6 hours'),
('Quotation approved','QTN-2026-0096 approved at 21.4% GP','crm',null,'90000000-0000-0000-0000-000000000001','Karim Dabbagh','success',now() - interval '15 hours',now() - interval '18 hours'),
('Large RFQ waiting for purchase','RFQ-2026-0125 worth approx AED 480,000 has been waiting 3 days','manager','a0000000-0000-0000-0000-000000000001',null,'System','warning',null,now() - interval '3 hours');

-- ACTIVITY LOG
insert into public.activity_logs (actor,action,entity,entity_id,created_at) values
('Rania Al-Farsi','Created RFQ-2026-0125','rfq','a0000000-0000-0000-0000-000000000001',now() - interval '4 days'),
('Rania Al-Farsi','Submitted RFQ-2026-0125 to purchase','rfq','a0000000-0000-0000-0000-000000000001',now() - interval '3 days'),
('Karim Dabbagh','Added supplier prices for C9300-48T-E','rfq','a0000000-0000-0000-0000-000000000001',now() - interval '2 days'),
('Karim Dabbagh','Selected Nexline IT Distribution for C9300-48T-E','rfq','a0000000-0000-0000-0000-000000000001',now() - interval '30 hours'),
('Karim Dabbagh','Marked RFQ-2026-0126 ready for CRM','rfq','a0000000-0000-0000-0000-000000000002',now() - interval '1 day'),
('Omar Siddiqui','Created quotation QTN-2026-0096','quotation','90000000-0000-0000-0000-000000000001',now() - interval '22 hours'),
('Karim Dabbagh','Approved quotation QTN-2026-0096','quotation','90000000-0000-0000-0000-000000000001',now() - interval '18 hours'),
('Omar Siddiqui','Sent QTN-2026-0096 to customer','quotation','90000000-0000-0000-0000-000000000001',now() - interval '16 hours'),
('Rania Al-Farsi','Submitted RFQ-2026-0127 to purchase','rfq','a0000000-0000-0000-0000-000000000003',now() - interval '20 hours');
