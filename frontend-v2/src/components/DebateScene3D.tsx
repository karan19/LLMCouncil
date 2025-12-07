'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    Text,
    Float,
    Environment,
    Stars,
    SpotLight,
    useTexture
} from '@react-three/drei';
import * as THREE from 'three';
import { getModelColor } from '@/lib/utils'; // We'll adapt color logic

// --- 3D Components ---

function Table() {
    return (
        <group position={[0, -1, 0]}>
            {/* Table Top */}
            <mesh receiveShadow position={[0, 0, 0]}>
                <cylinderGeometry args={[4, 4, 0.2, 64]} />
                <meshStandardMaterial
                    color="#1a1a1a"
                    roughness={0.2}
                    metalness={0.8}
                    envMapIntensity={1}
                />
            </mesh>
            {/* Table Glow Rim */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[4.05, 4.05, 0.18, 64]} />
                <meshBasicMaterial color="#000" transparent opacity={0.5} />
                {/* <meshStandardMaterial emissive="#3b82f6" emissiveIntensity={0.5} color="#000" /> */}
            </mesh>
            {/* Table Base */}
            <mesh receiveShadow position={[0, -2, 0]}>
                <cylinderGeometry args={[1, 2, 4, 32]} />
                <meshStandardMaterial color="#0f0f0f" roughness={0.8} />
            </mesh>
            {/* Holographic Center Grid (Decor) */}
            <gridHelper args={[6, 20, 0x333333, 0x111111]} position={[0, 0.11, 0]} />
        </group>
    );
}

function Chair({ position, rotation, model, isActive, index, onClick, systemPrompt }: any) {
    const groupRef = useRef<THREE.Group>(null);

    // Floating animation for active chair
    useFrame((state) => {
        if (groupRef.current && isActive) {
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.5;
        } else if (groupRef.current) {
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.1);
        }
    });

    const seatColor = useMemo(() => {
        if (index === 0) return '#60a5fa'; // Blue
        if (index === 1) return '#c084fc'; // Purple
        return '#34d399'; // Emerald
    }, [index]);

    return (
        <group position={position} rotation={rotation} ref={groupRef} onClick={onClick}>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, -0.5, 0]}>
                <boxGeometry args={[1.5, 0.1, 1.5]} />
                <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
            </mesh>
            {/* Backrest */}
            <mesh castShadow receiveShadow position={[0, 1, -0.7]}>
                <boxGeometry args={[1.5, 3, 0.1]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Seat Glow / Status Indicator */}
            <mesh position={[0, 2.5, -0.65]}>
                <circleGeometry args={[0.3, 32]} />
                <meshBasicMaterial color={isActive ? seatColor : '#555'} />
            </mesh>

            {/* Model Name Label (Floating) */}
            {model && (
                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
                    <group position={[0, 3.5, 0]}>
                        <Text
                            fontSize={0.4}
                            maxWidth={4}
                            lineHeight={1}
                            letterSpacing={0.02}
                            textAlign="center"
                            color={isActive ? "#fff" : "#aaa"}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {model.split('/').pop()}
                        </Text>
                        <Text
                            position={[0, -0.4, 0]}
                            fontSize={0.2}
                            color="#666"
                            anchorX="center"
                            anchorY="middle"
                        >
                            PANELIST {index + 1}
                        </Text>
                    </group>
                </Float>
            )}

            {/* SpotLight for Active Speaker */}
            {isActive && (
                <SpotLight
                    position={[0, 8, 2]}
                    angle={0.5}
                    penumbra={1}
                    intensity={80}
                    distance={20}
                    color={seatColor}
                    castShadow
                    target={groupRef.current}
                />
            )}
        </group>
    );
}

function SceneLighting() {
    return (
        <>
            <ambientLight intensity={0.2} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <pointLight position={[0, 10, 0]} intensity={20} color="#fff" />
        </>
    );
}


export default function DebateScene3D({
    panelModels,
    activeSpeakerIndex,
    onTriggerSpeaker,
}: {
    panelModels: string[];
    activeSpeakerIndex: number | null;
    onTriggerSpeaker: (index: number) => void;
}) {

    // Chair positions around the table (Triangle formation)
    const chairs = [
        { pos: [0, 0, -3.5], rot: [0, 0, 0], label: "Top" },          // Top Center
        { pos: [3, 0, 2], rot: [0, -Math.PI / 1.5, 0], label: "Right" }, // Bottom Right
        { pos: [-3, 0, 2], rot: [0, Math.PI / 1.5, 0], label: "Left" },  // Bottom Left
    ];

    return (
        <Canvas shadows className="w-full h-full bg-black">
            <PerspectiveCamera makeDefault position={[0, 6, 10]} fov={50} />
            <OrbitControls
                enableZoom={false}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2.5}
                enablePan={false}
            />

            <SceneLighting />

            <Table />

            {chairs.map((chair, index) => (
                <Chair
                    key={index}
                    index={index}
                    position={chair.pos}
                    rotation={chair.rot} // Euler angles array is valid for rotation prop
                    model={panelModels[index]}
                    isActive={activeSpeakerIndex === index}
                    onClick={() => onTriggerSpeaker(index)}
                />
            ))}

            <Environment preset="city" />
        </Canvas>
    );
}
