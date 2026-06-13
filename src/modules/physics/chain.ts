import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'

type Settings = {
  segments: number
  segmentLength: number
  segmentMass: number
  stiffness: number
  damping: number
}

export class Chain extends THREE.Object3D {
  public joints: RAPIER.RopeImpulseJoint[] = []

  // settings
  public settings: Settings = {
    segments:      10,
    segmentLength: 0.5,
    segmentMass:   1,
    stiffness:     1,
    damping:       0.1,
  }

  /**
   * Creates a chain of connected joints
   * to be used as a rope, such as a swinging wrecking ball
   *
   */
  constructor(options: Partial<Settings> = {}) {
    super()

    Object.assign(this.settings, options)

    this.joints.push(...this.createJoints())
  }

  createJoints(): RAPIER.RopeImpulseJoint[] {
    const joints: RAPIER.RopeImpulseJoint[] = []

    for (let i = 0; i < this.settings.segments; i++) {
      const joint = new RAPIER.RopeImpulseJoint(
        null as any, // bodyA will be set when the joint is added to the physics world
        null as any, // bodyB will be set when the joint is added to the physics world
        {
          localAnchor1: { x: 0, y: -this.settings.segmentLength / 2, z: 0 },
          localAnchor2: { x: 0, y: this.settings.segmentLength / 2, z: 0 },
          maxImpulse:   this.settings.stiffness,
          dampingRatio: this.settings.damping,
        },
      )
      joints.push(joint)
    }

    return joints
  }
}



/**
 * add joint to chain
 */
export function addJointToChain(chain: Chain, bodyA: RAPIER.RigidBody, bodyB: RAPIER.RigidBody, jointIndex: number) {
  const joint = chain.joints[jointIndex]
  joint.setBodies(bodyA, bodyB)
}



