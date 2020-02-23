import fs from 'fs';

const replay = JSON.parse(fs.readFileSync('./replay.json').toString());

const { frames } = replay.network_frames;
const alive = {};
const pawns = {};
const late = {
  updated: [],
};
const players = {}


const update = (actor, frame) => {
  actor.object_name = replay.objects[actor.object_id];
  switch (actor.object_name) {
    case 'Engine.Pawn:PlayerReplicationInfo':
      pawns[actor.actor_id] = actor.attribute.Flagged[1]
      break;
      
    case 'Archetypes.Car.Car_Default': // not used
      break;  

    case 'TAGame.Default__PRI_TA': // not used
      break;


    case 'TAGame.RBActor_TA:ReplicatedRBState':
      let player = alive[pawns[actor.actor_id]]
      if (player) {
        if (player.attributes.locations[frame.time]) {
          console.log(`frame ${frame.time} duplicated for ${player.actor_id}`)
        }
        const { bias, dx, dy, dz } = actor.attribute.RigidBody.location
        player.attributes.locations[frame.time] = {
          x: dx - bias,
          y: dy - bias,
          z: dz - bias,
        }
      } else {
        late.updated.push({actor, frame})
      }
      break;

    default:
      // we don't care for now
  }
}


// foreach frame in frames
for (let frame_index = 0; frame_index < frames.length; frame_index++) {
  let zero_deleted_index = null;

  const frame = frames[frame_index];
  for (let actor_index = 0; actor_index < frame.new_actors.length; actor_index++) {
    const actor = frame.new_actors[actor_index];
    actor.object_name = replay.objects[actor.object_id];
    if (actor.name_id) {
      actor.name = replay.names[actor.name_id];
    }

    switch (actor.object_name) {
      case 'Archetypes.Car.Car_Default':
        alive[actor.actor_id] = actor;
        break;
      case 'TAGame.Default__PRI_TA':
        console.log(`new player ${actor.actor_id}`)
        actor.attributes = {
          locations: {}
        }
        if (!alive[actor.actor_id]) {
          alive[actor.actor_id] = actor;
        }
        break;
      default:
        alive[actor.actor_id] = actor;
        // console.log(`created object ${actor.actor_id}`)
    }
  }
  for (let actor_index = 0; actor_index < frame.deleted_actors.length; actor_index++) {
    const actor_id = frame.deleted_actors[actor_index];
    const actor = players[actor_id];
    if (actor) {
      switch (actor.object_name) {
        
        case 'Archetypes.Car.Car_Default':
          
          break;

        case 'TAGame.Default__PRI_TA':
          console.log(`delete player ${actor_id}`)
      }
    }
    // console.log(`actor #${actor.actor_id} deleted`);
    delete alive[actor_id];
    if (actor_id == 0) {
      zero_deleted_index = frame_index;
      // console.log(frame_index, frame.time)
    }
  }




  // console.log(`rechecking ${late.updated.length} early frames`)
  
  let _late = late.updated;
  late.updated = [];
  let l;

  // console.log(_late[0])
  while (l = _late.pop())
  {
    
    let { actor, frame: lateFrame } = l
    // console.log({id: actor.actor_id, time: frame.time})
    update(actor, lateFrame)
  }

  for (let actor_index = 0; actor_index < frame.updated_actors.length; actor_index++) {
    const actor = frame.updated_actors[actor_index];
    update(actor, frame)
  }
}

//   for (let new_index = 0; new_index < frame.new_actors.length; new_index++) {
//     const actor = frame.new_actors[new_index];
//     actor.object_name = replay.objects[actor.object_id]
//     actor.attributes = {
//       'Engine.Pawn:PlayerReplicationInfo': []
//     };

//     if (alive[actor.actor_id] && alive[actor.actor_id].object_name != actor.object_name) {
//       // console.log(alive[actor.actor_id], actor)
//     } else {
//       alive[actor.actor_id] = actor
//     }


//     // process links_to_process
//   }

//   for (let deleted_index = 0; deleted_index < frame.deleted_actors.length; deleted_index++) {
//     const actor = frame.deleted_actors[deleted_index];
//     delete alive[actor.actor_id]
//     for (const [pawn_id, actor_id] of Object.entries(pawns)) {
//       if (actor.actor_id === actor_id) {
//         delete pawns[pawn_id]
//       }
//     }
//   }


//   for (let updated_index = 0; updated_index < frame.updated_actors.length; updated_index++) {
//     const actor = frame.updated_actors[updated_index];
//     actor.object_name = replay.objects[actor.object_id]
//     let parent_actor = alive[actor.actor_id]
//     if (parent_actor) {
//       parent_actor.attributes[actor.object_name] = actor.attribute
//     } else {
//       links_to_process.push({ time: frame.time, actor })
//     }

//     if (actor.object_name ==='Engine.Pawn:PlayerReplicationInfo') {
//       if (alive[actor.attribute.Flagged[1]]) {
//         pawns[actor.actor_id] = alive[actor.attribute.Flagged[1]].actor_id
//       } else {
//         links_to_process.push({ time: frame.time, actor })
//       }
//     }
//   }
//   for (let updated_index = 0; updated_index < frame.updated_actors.length; updated_index++) {
//     const actor = frame.updated_actors[updated_index];
//     if (actor.object_name === 'TAGame.RBActor_TA:ReplicatedRBState') {
//       // console.log(pawns[actor.actor_id])
//       if (alive[pawns[actor.actor_id]]) {
//         const player = alive[pawns[actor.actor_id]]
//         player.attributes.position = player.attributes.position || [];
//         player.attributes.position.push({ time: frame.time, ...actor.attribute.RigidBody })

//         // console.log(actor)
//       } else {
//         links_to_process.push({ time: frame.time, actor })
//       }
//     }
//   }
// }

// let out = Object.values(alive).filter(a => a.object_name == 'TAGame.Default__PRI_TA')
//   .map(a => ({ name: a.attributes['Engine.PlayerReplicationInfo:PlayerName'].String, positions: a.attributes.position.map(({x, y}) => ({ x, y })) }))


fs.writeFileSync('out/alive.json', JSON.stringify(alive, null, "  "));
// fs.writeFileSync('out/players.json', JSON.stringify(players, null, "  "));
// fs.writeFileSync('out/out.json', JSON.stringify(out, null, "  "));


//     foreach actor in frame.actors
//         if actor.new:
//             alive[actor.id] = { some object describing the actor}

//             foreach link in links_to_process:
//                 if link.to == actor.id:
//                     // the deferred link can now be resolved
//                     link.actor.attachTo(actor)
//                     delete link from  links_to_process

//         if actor.deleted:
//             delete alive[actor.id]
//             continue

//         foreach property in actor.properties:
//             // do what you need to do with the properties, e,g:
//             alive[actor.id].properties[property.name] = property.value

//             // unless the property is a link, e.g:
//             if property.name == 'Engine.Pawn:PlayerReplicationInfo':
//                 // in which case:

//                 // if we already encountered the referenced actor, it should be in the alive dict
//                 if alive[property.value] is defined:
//                    actor.attachTo(alive[property.value])
//                 else:
//                     // the referenced actor is not known yet
//                     // add the ink to the deferred list, it would get processed in the next frame (or the ones after)
//                     links_to_process.add({
//                         actor: actor,
//                         to: property.value
//                     })
