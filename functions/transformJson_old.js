import fs from 'fs';

Object.prototype.filter = function (cb) {
  return Object.entries(this).filter(([k, v]) => cb(v)).reduce((a, [k, v]) => { a[k] = v; return a; }, {});
};

const replay = JSON.parse(fs.readFileSync('./replay.json').toString());

const actors = {};
const cars = {};

const first = (obj) => Object.values(obj)[0];

const set = (obj, path, value) => {
  const parts = path.split(':');
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    obj[part] = obj[part] || {};
    obj = obj[part];
  }

  obj[parts[parts.length - 1]] = value;
};

const push = (obj, path, value) => {
  const parts = path.split(':');
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    obj[part] = obj[part] || {};
    obj = obj[part];
  }

  obj[parts[parts.length - 1]] = obj[parts[parts.length - 1]] || [];
  obj[parts[parts.length - 1]].push(value);
};
const { frames } = replay.network_frames;

for (let index = 0; index < frames.length; index++) {
  const frame = frames[index];

  for (let index = 0; index < frame.new_actors.length; index++) {
    const actor = frame.new_actors[index];
    actors[actor.actor_id] = {
      id: actor.actor_id,
      name: replay.names[actor.name_id],
      object: replay.objects[actor.object_id],
      attributes: {},
      location: actor.initial_trajectory,
    };
  }

  for (let index = 0; index < frame.updated_actors.length; index++) {
    const actor = frame.updated_actors[index];
    set(actors, `${actor.actor_id}:attributes:${replay.objects[actor.object_id]}`, first(actor.attribute));


    if (actor.object_id === 43 && actor.attribute.RigidBody) {
      const { x, y, z } = actor.attribute.RigidBody;
      push(cars, `${actor.actor_id}:times:${frame.time}`, { x, y, z });
    }
  }
}
for (const id of Object.keys(cars)) {
  set(cars, `${id}:data`, actors[id]);
}


// actors = actors.filter(a => a.object === 'TAGame.Default__PRI_TA')


const objects = {};

for (const actor of Object.values(actors)) {
  push(objects, actor.object, actor);
}


const cap = [];

const transformObjectName = (a) => {
  a.object = replay.objects[a.object_id];
  return a;
};

const transformInitialTrajectory = (a) => {
  if (a.initial_trajectory && a.initial_trajectory.location) {
    const {
      dx, dy, dz, bias,
    } = a.initial_trajectory.location;
    a.initial_trajectory.x = dx - bias;
    a.initial_trajectory.y = dy - bias;
    a.initial_trajectory.z = dz - bias;
  }
  return a;
};

const objectTypes = (a) => true;
// return [
//   'TAGame.CameraSettingsActor_TA:CameraPitch',
//   'TAGame.Default__CameraSettingsActor_TA',
//   'TAGame.PRI_TA:ClientLoadoutsOnline',
//   'TAGame.PRI_TA:ClientLoadouts',
//   'TAGame.CameraSettingsActor_TA:CameraYaw',
//   'TAGame.CameraSettingsActor_TA:bUsingSecondaryCamera',
//   'Engine.PlayerReplicationInfo:Ping'
// ].indexOf(a.object) === -1


for (let i = 0; i < 20; i++) {
  const {
    time, new_actors, deleted_actors, updated_actors,
  } = frames[i];
  const t = {
    time,
    new: new_actors.map(transformObjectName)
      .filter(objectTypes)
      .map(transformInitialTrajectory),
    updated: updated_actors.map(transformObjectName)
      .filter(objectTypes),
    deleted: deleted_actors.map(transformObjectName)
      .filter(objectTypes),
  };

  if (t.new.length > 0 || t.updated.length > 0 || t.deleted.length > 0) {
    cap.push(t);
  }
}


fs.writeFileSync('out/processed.json', JSON.stringify(actors, null, '  '));
fs.writeFileSync('out/objects.json', JSON.stringify(objects, null, '  '));
fs.writeFileSync('out/cars.json', JSON.stringify(cars, null, '  '));
fs.writeFileSync('out/frames.json', JSON.stringify(cap, null, '  '));


(() => {
  const actors = {};
  const players = {};
  const pawns = {};
  const cars = {};
  const actor_locations = {};

  for (let frame_index = 0; frame_index < frames.length; frame_index++) {
    const frame = frames[frame_index];

    for (let new_actor_index = 0; new_actor_index < frame.new_actors.length; new_actor_index++) {
      const actor = frame.new_actors[new_actor_index];
      actor.object = replay.objects[actor.object_id];

      if (actor.object === 'TAGame.Default__PRI_TA') {
        actor.car_actor = [];
        actor.positions = {};
        players[actor.actor_id] = actor;
      }
    }


    for (let updated_actor_index = 0; updated_actor_index < frame.updated_actors.length; updated_actor_index++) {
      const actor = frame.updated_actors[updated_actor_index];
      actor.object = replay.objects[actor.object_id];


      switch (actor.object) {
        case 'Engine.Pawn:PlayerReplicationInfo':
          const player = players[actor.attribute.Flagged[1]];
          if (player) {
            actor.player_id = player.actor_id;
            pawns[actor.actor_id] = actor;
          }
          break;
        // case 'TAGame.CarComponent_TA:Vehicle':
        //   let pawn = players[actor.attribute.Flagged[1]];
        //   if (pawn) {
        //     actor.pawn_id = pawn.actor_id;
        //     cars[actor.actor_id] = actor
        //   }
        //   break;
        case 'TAGame.RBActor_TA:ReplicatedRBState':
          actor_locations[actor.actor_id] = actor_locations[actor.actor_id] || {};
          const {
            dx, dy, dz, bias,
          } = actor.attribute.RigidBody.location;
          actor_locations[actor.actor_id][frame.time] = {
            location: {
              x: dx - bias,
              z: dz - bias,
              y: dy - bias,
            },
          };
          break;
      }
    }
  }

  const parsed = {
    players, pawns, cars, actor_locations,
  };
  fs.writeFileSync('out/parsed.json', JSON.stringify(parsed, null, '  '));
})();
