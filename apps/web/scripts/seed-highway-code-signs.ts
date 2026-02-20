#!/usr/bin/env tsx

/* eslint-disable no-console, no-await-in-loop */

/**
 * Seed script for Highway Code road signs.
 *
 * Inserts sign data into the highway_code_signs table and uploads
 * sign images from gov.uk to R2 storage.
 *
 * Data source: gov.uk Highway Code traffic signs
 * Images: Crown copyright (Open Government Licence v3.0)
 *
 * Usage: npx tsx scripts/seed-highway-code-signs.ts
 */

import { db } from '@parking-ticket-pal/db';
import { put } from '@/lib/storage';

// ============================================================================
// Highway Code sign data
// ============================================================================
// Curated from gov.uk Highway Code — warning, regulatory, informatory signs
// that work well as quiz content. Direction signs excluded (too complex).

type SignEntry = {
  name: string;
  category: 'warning' | 'regulatory' | 'informatory';
  description: string;
  imageUrl: string; // gov.uk source URL for downloading
  govUkRef?: string;
};

const SIGNS: SignEntry[] = [
  // ===== WARNING SIGNS =====
  {
    name: 'Road narrows on both sides',
    category: 'warning',
    description:
      'Warning that the road ahead becomes narrower on both sides. Reduce speed and be prepared to give way.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04c5e5274a14870000a5/warning-sign-road-narrows-both-sides.jpg',
    govUkRef: 'warning-road-narrows',
  },
  {
    name: 'Road narrows on right',
    category: 'warning',
    description: 'Warning that the road ahead narrows on the right-hand side.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04c7ed915d15740000a7/warning-sign-road-narrows-right.jpg',
    govUkRef: 'warning-road-narrows-right',
  },
  {
    name: 'Two-way traffic crosses one-way road',
    category: 'warning',
    description:
      'Warning that two-way traffic crosses ahead on a one-way road. Look both ways before proceeding.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04caed915d15740000ab/warning-sign-two-way-traffic-crosses.jpg',
    govUkRef: 'warning-two-way-crosses',
  },
  {
    name: 'Two-way traffic straight ahead',
    category: 'warning',
    description:
      'Warning of two-way traffic ahead, typically placed where a dual carriageway or one-way street ends.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04c7e5274a14870000a7/warning-sign-two-way-traffic.jpg',
    govUkRef: 'warning-two-way-ahead',
  },
  {
    name: 'Bend to right ahead',
    category: 'warning',
    description:
      'Warning of a bend to the right ahead. Slow down and stay in your lane.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04b0e5274a14870000a0/warning-sign-bend-right.jpg',
    govUkRef: 'warning-bend-right',
  },
  {
    name: 'Double bend, first to left',
    category: 'warning',
    description:
      'Warning of a double bend ahead, starting with a bend to the left. Reduce speed.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04b2ed915d15740000a2/warning-sign-double-bend.jpg',
    govUkRef: 'warning-double-bend',
  },
  {
    name: 'Roundabout',
    category: 'warning',
    description:
      'Warning of a roundabout ahead. Give way to traffic from the right unless road markings indicate otherwise.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04b4ed915d15740000a4/warning-sign-roundabout.jpg',
    govUkRef: 'warning-roundabout',
  },
  {
    name: 'Crossroads',
    category: 'warning',
    description:
      'Warning of a crossroads ahead. Approach with caution and be prepared to stop.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04a8ed915d157400009d/warning-sign-crossroads.jpg',
    govUkRef: 'warning-crossroads',
  },
  {
    name: 'Junction on bend ahead',
    category: 'warning',
    description:
      'Warning of a junction on a bend in the road ahead. Be especially alert for vehicles emerging.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04a9e5274a148700009d/warning-sign-junction-on-bend.jpg',
    govUkRef: 'warning-junction-bend',
  },
  {
    name: 'T-junction with priority over vehicles from the right',
    category: 'warning',
    description:
      'Warning of a T-junction ahead where you have priority. Vehicles may emerge from the right.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04aaed915d157400009e/warning-sign-t-junction.jpg',
    govUkRef: 'warning-t-junction',
  },
  {
    name: 'Staggered junction',
    category: 'warning',
    description:
      'Warning of a staggered junction ahead — two side roads that do not directly line up.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04abed915d157400009f/warning-sign-staggered-junction.jpg',
    govUkRef: 'warning-staggered-junction',
  },
  {
    name: 'Traffic merging from left',
    category: 'warning',
    description:
      'Warning that traffic may merge from the left ahead. Check mirrors and adjust speed.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04ace5274a148700009e/warning-sign-merge-left.jpg',
    govUkRef: 'warning-merge-left',
  },
  {
    name: 'Steep hill downwards',
    category: 'warning',
    description:
      'Warning of a steep downhill gradient ahead. Use low gear and avoid heavy braking.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04b6ed915d15740000a5/warning-sign-steep-hill-down.jpg',
    govUkRef: 'warning-steep-down',
  },
  {
    name: 'Steep hill upwards',
    category: 'warning',
    description:
      'Warning of a steep uphill gradient ahead. Be prepared to change to a lower gear.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04b8e5274a14870000a2/warning-sign-steep-hill-up.jpg',
    govUkRef: 'warning-steep-up',
  },
  {
    name: 'Uneven road',
    category: 'warning',
    description:
      'Warning of an uneven road surface ahead. Reduce speed to avoid damage.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04bae5274a14870000a3/warning-sign-uneven-road.jpg',
    govUkRef: 'warning-uneven-road',
  },
  {
    name: 'Road hump',
    category: 'warning',
    description: 'Warning of a road hump (speed bump) ahead. Slow down.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04bbed915d15740000a6/warning-sign-hump-bridge.jpg',
    govUkRef: 'warning-road-hump',
  },
  {
    name: 'Risk of grounding',
    category: 'warning',
    description:
      'Warning that vehicles with low ground clearance may ground at this point, typically at railway crossings or bridge humps.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0595e5274a14870000c7/warning-sign-risk-of-grounding.jpg',
    govUkRef: 'warning-risk-grounding',
  },
  {
    name: 'Traffic signals ahead',
    category: 'warning',
    description:
      'Warning of traffic signals ahead. Be prepared to stop on red.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04d4e5274a14870000ac/warning-sign-traffic-signals.jpg',
    govUkRef: 'warning-traffic-signals',
  },
  {
    name: 'Slippery road',
    category: 'warning',
    description:
      'Warning that the road surface may be slippery. Reduce speed and avoid harsh braking or steering.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04d5ed915d15740000af/warning-sign-slippery-road.jpg',
    govUkRef: 'warning-slippery-road',
  },
  {
    name: 'Level crossing without barrier or gate ahead',
    category: 'warning',
    description:
      'Warning of a level crossing ahead without a barrier or gate. Look both ways and listen for trains.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04d0ed915d15740000ac/warning-sign-level-crossing-no-barrier.jpg',
    govUkRef: 'warning-level-crossing-no-barrier',
  },
  {
    name: 'Level crossing with barrier or gate ahead',
    category: 'warning',
    description:
      'Warning of a level crossing ahead with a barrier or gate. Be prepared to stop when barriers are down.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04ceed915d15740000ad/warning-sign-level-crossing-barrier.jpg',
    govUkRef: 'warning-level-crossing-barrier',
  },
  {
    name: 'Cattle',
    category: 'warning',
    description:
      'Warning that cattle may be crossing the road ahead. Slow down and be prepared to stop.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04d7ed915d15740000b0/warning-sign-cattle.jpg',
    govUkRef: 'warning-cattle',
  },
  {
    name: 'Wild animals',
    category: 'warning',
    description:
      'Warning of wild animals that may be on the road. Often seen near deer-populated areas.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04d8e5274a14870000ae/warning-sign-wild-animals.jpg',
    govUkRef: 'warning-wild-animals',
  },
  {
    name: 'Accompanied horses or ponies',
    category: 'warning',
    description:
      'Warning that horses or ponies with riders may be on the road ahead. Pass wide and slow.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04dae5274a14870000af/warning-sign-horses.jpg',
    govUkRef: 'warning-horses',
  },
  {
    name: 'Falling or fallen rocks',
    category: 'warning',
    description:
      'Warning of potential rockfall or debris on the road. Be alert and drive carefully.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04dbed915d15740000b2/warning-sign-falling-rocks.jpg',
    govUkRef: 'warning-falling-rocks',
  },
  {
    name: 'Pedestrian crossing ahead',
    category: 'warning',
    description:
      'Warning of a pedestrian crossing ahead. Be prepared to stop for pedestrians.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04beed915d15740000a8/warning-sign-pedestrian-crossing.jpg',
    govUkRef: 'warning-pedestrian-crossing',
  },
  {
    name: 'School crossing patrol ahead',
    category: 'warning',
    description:
      'Warning that a school crossing patrol may be operating ahead. Watch for children.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04c0e5274a14870000a3/warning-sign-school-crossing.jpg',
    govUkRef: 'warning-school-crossing',
  },
  {
    name: 'Children going to or from school',
    category: 'warning',
    description:
      'Warning that children may be crossing the road near a school. Drive slowly and be alert.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04c1ed915d15740000a9/warning-sign-children.jpg',
    govUkRef: 'warning-children',
  },
  {
    name: 'Cyclists',
    category: 'warning',
    description:
      'Warning that cyclists may be on the road ahead. Give them plenty of room.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04c2e5274a14870000a4/warning-sign-cyclists.jpg',
    govUkRef: 'warning-cyclists',
  },
  {
    name: 'Ice or risk of ice',
    category: 'warning',
    description:
      'Warning of icy conditions ahead. Reduce speed and avoid sudden manoeuvres.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04dced915d15740000b3/warning-sign-ice.jpg',
    govUkRef: 'warning-ice',
  },
  {
    name: 'Queues likely ahead',
    category: 'warning',
    description:
      'Warning that slow-moving or stationary traffic is likely ahead. Be ready to stop.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04dee5274a14870000b0/warning-sign-queues.jpg',
    govUkRef: 'warning-queues',
  },
  {
    name: 'Tunnel ahead',
    category: 'warning',
    description:
      'Warning of a tunnel ahead. Switch on headlights and remove sunglasses.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04dfe5274a14870000b1/warning-sign-tunnel.jpg',
    govUkRef: 'warning-tunnel',
  },
  {
    name: 'Ford (water crossing)',
    category: 'warning',
    description:
      'Warning of a ford or water crossing on the road ahead. Check depth before crossing.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04e1ed915d15740000b5/warning-sign-ford.jpg',
    govUkRef: 'warning-ford',
  },
  {
    name: 'Opening or swing bridge ahead',
    category: 'warning',
    description:
      'Warning of an opening or swing bridge ahead. Be prepared to stop and wait.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04e2e5274a14870000b3/warning-sign-opening-bridge.jpg',
    govUkRef: 'warning-opening-bridge',
  },
  {
    name: 'Low-flying aircraft or sudden aircraft noise',
    category: 'warning',
    description:
      'Warning of low-flying aircraft ahead or sudden aircraft noise. Do not be startled.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04e3ed915d15740000b6/warning-sign-low-flying-aircraft.jpg',
    govUkRef: 'warning-low-aircraft',
  },
  {
    name: 'Overhead electric cable',
    category: 'warning',
    description:
      'Warning of overhead electric cables. Height restriction plate may follow.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04e5e5274a14870000b4/warning-sign-overhead-cables.jpg',
    govUkRef: 'warning-overhead-cables',
  },
  {
    name: 'Side winds',
    category: 'warning',
    description:
      'Warning of strong side winds, usually on exposed bridges or open stretches. Keep a firm grip on the steering.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04e6ed915d15740000b7/warning-sign-side-winds.jpg',
    govUkRef: 'warning-side-winds',
  },

  // ===== REGULATORY SIGNS =====
  {
    name: 'Give way',
    category: 'regulatory',
    description:
      'You must give way to traffic on the major road. Slow down and stop if necessary.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04e8e5274a14870000b5/regulatory-sign-give-way.jpg',
    govUkRef: 'regulatory-give-way',
  },
  {
    name: 'Stop',
    category: 'regulatory',
    description: 'You must stop at the line. Look both ways before proceeding.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba04eaed915d15740000b8/regulatory-sign-stop.jpg',
    govUkRef: 'regulatory-stop',
  },
  {
    name: 'No entry for vehicular traffic',
    category: 'regulatory',
    description:
      'No vehicles may enter this road. The road is one-way in the opposite direction.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0502e5274a14870000b6/regulatory-sign-no-entry.jpg',
    govUkRef: 'regulatory-no-entry',
  },
  {
    name: 'No vehicles except bicycles being pushed',
    category: 'regulatory',
    description:
      'All motor vehicles are prohibited. Cyclists may push their bicycles through.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0504ed915d15740000b9/regulatory-sign-no-vehicles.jpg',
    govUkRef: 'regulatory-no-vehicles',
  },
  {
    name: 'No motor vehicles',
    category: 'regulatory',
    description:
      'No motor vehicles allowed on this road. Cyclists and pedestrians may proceed.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0506e5274a14870000b7/regulatory-sign-no-motor-vehicles.jpg',
    govUkRef: 'regulatory-no-motor',
  },
  {
    name: 'No overtaking',
    category: 'regulatory',
    description:
      'Overtaking is prohibited. Stay behind the vehicle in front until the restriction ends.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba050de5274a14870000ba/regulatory-sign-no-overtaking.jpg',
    govUkRef: 'regulatory-no-overtaking',
  },
  {
    name: 'No U-turns',
    category: 'regulatory',
    description:
      'U-turns are not permitted. Continue ahead and find an alternative route.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba050fe5274a14870000bb/regulatory-sign-no-u-turns.jpg',
    govUkRef: 'regulatory-no-u-turns',
  },
  {
    name: 'No left turn',
    category: 'regulatory',
    description: 'Left turns are not permitted at this junction.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0510ed915d15740000be/regulatory-sign-no-left-turn.jpg',
    govUkRef: 'regulatory-no-left-turn',
  },
  {
    name: 'No right turn',
    category: 'regulatory',
    description: 'Right turns are not permitted at this junction.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0512e5274a14870000bc/regulatory-sign-no-right-turn.jpg',
    govUkRef: 'regulatory-no-right-turn',
  },
  {
    name: 'National speed limit applies',
    category: 'regulatory',
    description:
      'The national speed limit applies from this point: 60 mph on single carriageways, 70 mph on dual carriageways/motorways.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0514ed915d15740000bf/regulatory-sign-national-speed-limit.jpg',
    govUkRef: 'regulatory-national-speed',
  },
  {
    name: '30 mph speed limit',
    category: 'regulatory',
    description:
      'The maximum speed is 30 mph. Commonly seen in built-up areas near homes and schools.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0515e5274a14870000bd/regulatory-sign-30-mph.jpg',
    govUkRef: 'regulatory-30-mph',
  },
  {
    name: '20 mph zone',
    category: 'regulatory',
    description:
      'The maximum speed is 20 mph. Often found near schools and residential streets.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0517ed915d15740000c0/regulatory-sign-20-zone.jpg',
    govUkRef: 'regulatory-20-zone',
  },
  {
    name: 'No waiting',
    category: 'regulatory',
    description:
      'No waiting at any time. You may stop briefly to pick up or set down passengers.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba051aed915d15740000c1/regulatory-sign-no-waiting.jpg',
    govUkRef: 'regulatory-no-waiting',
  },
  {
    name: 'No stopping (Clearway)',
    category: 'regulatory',
    description:
      'No stopping at any time, not even to pick up or set down passengers. Clearway — keep moving.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba051be5274a14870000be/regulatory-sign-no-stopping.jpg',
    govUkRef: 'regulatory-no-stopping',
  },
  {
    name: 'Urban clearway',
    category: 'regulatory',
    description:
      'No stopping during times shown except to pick up or set down passengers.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0537ed915d15740000c2/regulatory-sign-urban-clearway.jpg',
    govUkRef: 'regulatory-urban-clearway',
  },
  {
    name: 'One-way traffic',
    category: 'regulatory',
    description:
      'Traffic flows in one direction only — the direction shown by the arrow.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0539e5274a14870000bf/regulatory-sign-one-way.jpg',
    govUkRef: 'regulatory-one-way',
  },
  {
    name: 'Keep left',
    category: 'regulatory',
    description:
      'You must pass on the left-hand side of the central reservation, bollard, or island.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba053ae5274a14870000c0/regulatory-sign-keep-left.jpg',
    govUkRef: 'regulatory-keep-left',
  },
  {
    name: 'Turn left ahead (mandatory)',
    category: 'regulatory',
    description:
      'You must turn left ahead. Continuing straight or turning right is not permitted.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba053ced915d15740000c3/regulatory-sign-turn-left.jpg',
    govUkRef: 'regulatory-turn-left',
  },
  {
    name: 'Ahead only',
    category: 'regulatory',
    description:
      'You must proceed straight ahead. No turns are permitted at this point.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba053de5274a14870000c1/regulatory-sign-ahead-only.jpg',
    govUkRef: 'regulatory-ahead-only',
  },
  {
    name: 'Mini-roundabout',
    category: 'regulatory',
    description:
      'Give way to traffic from the right. Drive around the white circle in the centre.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba053fe5274a14870000c2/regulatory-sign-mini-roundabout.jpg',
    govUkRef: 'regulatory-mini-roundabout',
  },
  {
    name: 'Pedestrian zone — no vehicles',
    category: 'regulatory',
    description:
      'Vehicles are not permitted during the times shown. Usually enforced in town centre pedestrian areas.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0540ed915d15740000c4/regulatory-sign-pedestrian-zone.jpg',
    govUkRef: 'regulatory-pedestrian-zone',
  },
  {
    name: 'Congestion charge zone',
    category: 'regulatory',
    description:
      'You are entering a congestion charge zone. A daily charge applies during operating hours.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba058ee5274a14870000c5/regulatory-sign-congestion-charge.jpg',
    govUkRef: 'regulatory-congestion-charge',
  },
  {
    name: 'Bus lane ahead',
    category: 'regulatory',
    description:
      'A bus lane operates ahead. Only buses, licensed taxis, and sometimes cyclists may use it during operating hours.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba058fe5274a14870000c6/regulatory-sign-bus-lane.jpg',
    govUkRef: 'regulatory-bus-lane',
  },
  {
    name: 'Permit holders only',
    category: 'regulatory',
    description:
      'Only vehicles with a valid parking permit may park here. Others will receive a penalty charge notice.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0591ed915d15740000c8/regulatory-sign-permit-holders.jpg',
    govUkRef: 'regulatory-permit-holders',
  },
  {
    name: 'Red route — no stopping at any time',
    category: 'regulatory',
    description:
      'No stopping, waiting, or parking at any time on this red route. Enforced by cameras.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0592e5274a14870000c7/regulatory-sign-red-route.jpg',
    govUkRef: 'regulatory-red-route',
  },
  {
    name: 'Controlled zone — no parking',
    category: 'regulatory',
    description:
      'You are entering a controlled parking zone. No parking except in marked bays during controlled hours.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba0594ed915d15740000c9/regulatory-sign-controlled-zone.jpg',
    govUkRef: 'regulatory-controlled-zone',
  },

  // ===== INFORMATORY SIGNS =====
  {
    name: 'Hospital ahead with Accident and Emergency facilities',
    category: 'informatory',
    description:
      'A hospital with A&E facilities is ahead. Follow the sign if you need emergency medical care.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba059aed915d15740000ca/informatory-sign-hospital.jpg',
    govUkRef: 'info-hospital',
  },
  {
    name: 'Parking place',
    category: 'informatory',
    description:
      'A car park or designated parking place is available in the direction indicated.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba059bed915d15740000cb/informatory-sign-parking.jpg',
    govUkRef: 'info-parking',
  },
  {
    name: 'Park and Ride',
    category: 'informatory',
    description:
      'A Park and Ride facility is available ahead. Park your car and use public transport to the town centre.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba059de5274a14870000c8/informatory-sign-park-and-ride.jpg',
    govUkRef: 'info-park-and-ride',
  },
  {
    name: 'Tourist information point',
    category: 'informatory',
    description:
      'A tourist information centre is available in the direction shown.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba059ee5274a14870000c9/informatory-sign-tourist-info.jpg',
    govUkRef: 'info-tourist',
  },
  {
    name: 'Pedestrian crossing point',
    category: 'informatory',
    description: 'Indicates a safe place for pedestrians to cross the road.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05a0ed915d15740000cc/informatory-sign-pedestrian-crossing.jpg',
    govUkRef: 'info-pedestrian-crossing',
  },
  {
    name: 'Motorway start',
    category: 'informatory',
    description:
      'You are entering a motorway. Motorway regulations now apply — no pedestrians, cyclists, or slow vehicles.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05a1e5274a14870000ca/informatory-sign-motorway-start.jpg',
    govUkRef: 'info-motorway-start',
  },
  {
    name: 'End of motorway',
    category: 'informatory',
    description:
      'The motorway ends ahead. Adjust your speed for non-motorway roads.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05a3ed915d15740000cd/informatory-sign-motorway-end.jpg',
    govUkRef: 'info-motorway-end',
  },
  {
    name: 'Electric vehicle recharging point',
    category: 'informatory',
    description:
      'An electric vehicle charging point is available nearby. Indicated by the green cable symbol.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05a4e5274a14870000cb/informatory-sign-ev-charging.jpg',
    govUkRef: 'info-ev-charging',
  },
  {
    name: 'Low emission zone',
    category: 'informatory',
    description:
      'You are entering a Low Emission Zone. Vehicles that do not meet emission standards will be charged.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05a6ed915d15740000ce/informatory-sign-low-emission-zone.jpg',
    govUkRef: 'info-low-emission-zone',
  },
  {
    name: 'Speed camera ahead',
    category: 'informatory',
    description:
      'A speed camera is in use ahead. Ensure you are within the posted speed limit.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05a7e5274a14870000cc/informatory-sign-speed-camera.jpg',
    govUkRef: 'info-speed-camera',
  },
  {
    name: 'Cycle route ahead',
    category: 'informatory',
    description:
      'A signed cycle route starts ahead. Cyclists — follow the route. Drivers — watch for cyclists.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05a9ed915d15740000cf/informatory-sign-cycle-route.jpg',
    govUkRef: 'info-cycle-route',
  },
  {
    name: 'Shared cycle and pedestrian route',
    category: 'informatory',
    description:
      'This route is shared between cyclists and pedestrians. Both should show consideration for each other.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05aae5274a14870000cd/informatory-sign-shared-route.jpg',
    govUkRef: 'info-shared-route',
  },
  {
    name: 'Telephone (for emergencies)',
    category: 'informatory',
    description:
      'An emergency telephone is located nearby, typically on motorways for breakdowns.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05ace5274a14870000ce/informatory-sign-emergency-telephone.jpg',
    govUkRef: 'info-emergency-telephone',
  },
  {
    name: 'Countdown markers before motorway exit',
    category: 'informatory',
    description:
      'Each bar represents 100 yards to the motorway exit. Three bars = 300 yards, two bars = 200 yards, one bar = 100 yards.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05aded915d15740000d0/informatory-sign-countdown-markers.jpg',
    govUkRef: 'info-countdown-markers',
  },
  {
    name: 'Advisory maximum speed',
    category: 'informatory',
    description:
      'The maximum recommended speed for the hazard ahead. Not legally enforceable but strongly advised.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05afe5274a14870000cf/informatory-sign-advisory-speed.jpg',
    govUkRef: 'info-advisory-speed',
  },
  {
    name: 'Tramway — look out for trams',
    category: 'informatory',
    description:
      'Trams operate in this area. Look both ways and listen for trams before crossing tracks.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05b0ed915d15740000d1/informatory-sign-tram.jpg',
    govUkRef: 'info-tram',
  },
  {
    name: 'Diversion route',
    category: 'informatory',
    description:
      'Follow this symbol to navigate the signed diversion route when the main road is closed.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05b2e5274a14870000d0/informatory-sign-diversion.jpg',
    govUkRef: 'info-diversion',
  },
  {
    name: 'Lane closed ahead',
    category: 'informatory',
    description:
      'A lane closure is ahead, often for roadworks. Merge in turn when indicated.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05b3ed915d15740000d2/informatory-sign-lane-closed.jpg',
    govUkRef: 'info-lane-closed',
  },
  {
    name: 'Recommended route for pedal cycles',
    category: 'informatory',
    description:
      'This sign shows the recommended route for cyclists to follow.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05b5e5274a14870000d1/informatory-sign-recommended-cycle-route.jpg',
    govUkRef: 'info-recommended-cycle',
  },
  {
    name: 'Area where cameras are used to enforce traffic regulations',
    category: 'informatory',
    description:
      'CCTV cameras are in use to enforce traffic rules, including bus lane violations and parking restrictions.',
    imageUrl:
      'https://assets.publishing.service.gov.uk/media/55ba05b6ed915d15740000d3/informatory-sign-camera-enforcement.jpg',
    govUkRef: 'info-camera-enforcement',
  },
];

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🚦 Seeding Highway Code signs...\n');

  // Check for existing signs
  const existingCount = await db.highwayCodeSign.count();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing signs.`);
    console.log('   Delete them first if you want a fresh seed.\n');
    console.log('   Skipping already-existing signs by govUkRef.\n');
  }

  let created = 0;
  let skipped = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const sign of SIGNS) {
    // Skip if govUkRef already exists
    if (sign.govUkRef) {
      const existing = await db.highwayCodeSign.findFirst({
        where: { govUkRef: sign.govUkRef },
      });
      if (existing) {
        console.log(`⏭️  Skipped (exists): ${sign.name}`);
        skipped += 1;
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    // Download image from gov.uk
    let r2Url: string;
    try {
      const imageResponse = await fetch(sign.imageUrl);
      if (!imageResponse.ok) {
        console.warn(
          `⚠️  Could not download image for "${sign.name}" — using source URL directly`,
        );
        r2Url = sign.imageUrl;
      } else {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const contentType =
          imageResponse.headers.get('content-type') || 'image/png';
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const slug = sign.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const r2Path = `social/highway-code-signs/${sign.category}/${slug}.${ext}`;

        const result = await put(r2Path, imageBuffer, { contentType });
        r2Url = result.url;
      }
    } catch {
      console.warn(
        `⚠️  Failed to upload image for "${sign.name}" — using source URL directly`,
      );
      r2Url = sign.imageUrl;
    }

    // Insert into DB
    await db.highwayCodeSign.create({
      data: {
        name: sign.name,
        category: sign.category,
        description: sign.description,
        imageUrl: r2Url,
        govUkRef: sign.govUkRef,
      },
    });

    console.log(`✅ Created: ${sign.name} (${sign.category})`);
    created += 1;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total in DB: ${await db.highwayCodeSign.count()}`);
  console.log('\n🎉 Done!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
